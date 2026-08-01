# Testing the commerce backend (Echo)

Two tiers: fast pure unit tests that run anywhere with no secrets, and a local
integration harness for the money paths that genuinely need Stripe + a database.

## 1. Unit tests (no secrets, run anywhere)

```bash
npm test
```

Node's built-in runner (native TypeScript, no extra deps). Covers the pricing
seam, the security property that matters most in a store:

- `tests/pricing.test.ts`, the server re-prices every line from its own catalog
  and **ignores any client-supplied price**, drops unknown slugs, clamps quantity
  to `[1, MAX_QTY]`, rounds to whole cents. The tampered-cart attack (`price: 1`
  for a 220 euro shoe) is asserted to fail.
- `tests/money.test.ts`, EUR formatting and discount math.

Add a test here whenever you touch `lib/pricing.ts` or `lib/money.ts`. Keep this
tier pure (no Stripe/Supabase imports) so it stays instant and keyless.

## 2. Integration: webhook idempotency (needs Stripe CLI + a database)

The webhook (`src/pages/api/stripe-webhook.ts`) must be **idempotent**: Stripe
retries `checkout.session.completed`, and the inventory decrement is not
reversible, so a retry must not draw stock down twice. The guard is the atomic
`update(...).eq('id', orderId).neq('status', 'paid')`, only the first delivery
flips `pending -> paid` and runs `decrement_inventory`. This can only be proven
against a real DB, so it lives here, not in the unit tier.

### One-time setup

1. **Database.** Either `supabase start` (local stack) or a throwaway Supabase
   branch. Apply the schema: `supabase/migrations/0001_init.sql`. Seed:
   `npm run seed`.
2. **Env.** Copy `.env.example` to `.env` and fill Supabase + **test-mode**
   Stripe keys (`sk_test_...`). Leave `PUBLIC_SITE_URL=http://localhost:4501`.
3. **Stripe CLI.** Install it, `stripe login`, then in its own terminal:
   ```bash
   stripe listen --forward-to localhost:4501/api/stripe-webhook
   ```
   Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET` in `.env`.

### Run the checks

Start the app (`npm run dev`), then:

**a. Happy path.** Add to bag, check out with test card `4242 4242 4242 4242`.
Confirm: the `orders` row goes `pending -> paid`, `order_items` match, and each
line's inventory dropped by its quantity exactly once.

**b. Idempotency (the important one).** Replay the same event twice:
```bash
stripe events resend <evt_id>     # or: stripe trigger checkout.session.completed
```
Fire it a second time. Confirm the order stays `paid` and inventory does **not**
decrement again. If stock drops twice, the `.neq('status','paid')` guard or the
`decrement_inventory` RPC has regressed.

**c. Bad signature.** `curl -X POST localhost:4501/api/stripe-webhook -d '{}'`
must return `400` (signature verification), never `200`.

### After schema changes

Run `get_advisors` (Supabase MCP) and `npm run audit:security` and clear what
they flag. RLS must be on for every client-reachable table; the service-role key
is server-only and must never reach the browser bundle.
