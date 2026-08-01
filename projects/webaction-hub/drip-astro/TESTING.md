# Testing the DRIP backend (Echo)

Two tiers: fast pure unit tests that run anywhere with no secrets, and a local
integration harness for the money paths that genuinely need Stripe + a database.

## 1. Unit tests (no secrets, run anywhere)

```bash
npm test
```

Node's built-in runner (native TypeScript, no extra deps — Node 22.6+). All the
money-path invariants live here because they are pure and must always hold:

- `tests/pricing.test.ts` — the checkout **price re-validation** seam
  (`src/lib/pricing.ts`). The server re-prices every line from its own catalog
  and **ignores any client-supplied price**, drops unknown slugs, clamps quantity
  to `[1, MAX_QTY]`, rounds to whole cents, defaults size to `OS`. The tampered-cart
  attack (`price: 1` for a €1,200 grail) is asserted to fail.
- `tests/fulfillment.test.ts` — the paid-order **webhook idempotency** seam
  (`src/lib/fulfillment.ts`). Drives the real `fulfilPaidOrder` orchestration
  against an in-memory store that models the atomic `UPDATE ... WHERE status <>
  'paid'` guard. Proves a Stripe **retry decrements stock zero extra times**,
  three concurrent re-deliveries decrement exactly once, and stock never goes
  negative.
- `tests/stock.test.ts` — the **pre-flight stock validation** seam
  (`src/lib/stock.ts`). `/api/checkout` checks the bag against live `inventory`
  BEFORE creating the order or the Stripe session; a short bag gets a clean 409
  with per-line detail (sold out vs only-N-left), untracked products stay
  purchasable, and duplicate lines for the same slug+size are summed. The tiny
  residual race (two payments in the same seconds) stays handled by the
  floor-at-0 webhook plus a manual refund from /admin.
- `tests/ready.test.ts` — the **"not configured" fallback** predicates
  (`src/lib/ready.ts`). With the `.env` placeholders in place, `isStripeSecret()`
  is false, so `/api/checkout` returns a friendly 503 and the rest of the site
  is unaffected. Flips to ready the moment a real `sk_test_`/`sk_live_` key lands.
- `tests/order-email.test.ts` — the pure **order-email builders**
  (`src/lib/order-email.ts`): EL and EN copy both present, receipt-precise
  totals (no display rounding), every line item rendered, shipping address
  omitted cleanly when absent, product names HTML-escaped, zero em-dashes.
- `tests/email.test.ts` — the **Resend sender** (`src/lib/email.ts`) with an
  injected fetch: no key = graceful skip with NO network call; real key = one
  POST with Bearer auth and the right payload; API errors and network failures
  are swallowed (never a throw), so the Stripe webhook always returns its 200.
- `tests/money.test.ts` — EUR display formatting and discount math.

Keep this tier pure (no Stripe/Supabase imports; `lib/email.ts` reads env
lazily with a process.env fallback exactly so it stays node:test-runnable) and
keyless. Add a test whenever you touch `lib/pricing.ts`, `lib/fulfillment.ts`,
`lib/stock.ts`, `lib/ready.ts`, `lib/order-email.ts`, `lib/email.ts`, or
`lib/money.ts`.

## 2. Integration: needs Stripe CLI + the database

These exercise paths that can only be proven against real services, so they are
run by hand, not in the unit tier.

### One-time setup

1. **Keys.** Fill `.env` with the Supabase service-role key (already set) and
   **test-mode** Stripe keys (`sk_test_...` / `pk_test_...`). Keep
   `PUBLIC_SITE_URL=http://localhost:4501`.
2. **Stripe CLI.** Install it, `stripe login`, then in its own terminal:
   ```bash
   stripe listen --forward-to localhost:4501/api/stripe-webhook
   ```
   Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET` in `.env`.
3. **Run** the app: `npm run dev` (dev server on port 4501, see
   `scripts/dev-server.mjs`).

### a. Happy path (money path end to end)

Add to bag, check out with test card `4242 4242 4242 4242`. Confirm:
the `orders` row goes `pending -> paid`, `order_items` match, and each line's
`inventory.quantity` dropped by its quantity exactly once.

With `RESEND_API_KEY` set, also confirm the order-confirmation email arrives
(unverified Resend accounts deliver only to the account owner's address, from
`onboarding@resend.dev`), and that a webhook REPLAY does not re-send it (the
email block runs only on the first pending -> paid flip). Without the key,
confirm the dev-server log shows `[email] RESEND_API_KEY not set, skipping: ...`
and the webhook still returns 200.

### b. Webhook idempotency (the important one)

Replay the same event twice:
```bash
stripe events resend <evt_id>     # or: stripe trigger checkout.session.completed
```
Confirm the order stays `paid` and inventory does **not** decrement again. If
stock drops twice, the `.neq('status','paid')` guard in
`api/stripe-webhook.ts` or the `decrement_inventory` RPC has regressed. (The
orchestration is unit-tested in tier 1; this proves the DB atomicity end to end.)

### c. Bad webhook signature

```bash
curl -X POST localhost:4501/api/stripe-webhook -d '{}'
```
must return `400` (signature verification), never `200`.

### d. Admin-route auth enforcement (broken-access-control)

Every `/api/admin/*` route and `/admin*` page is gated server-side by
`profiles.is_admin` (via `lib/admin-guard.ts`), not just hidden in the UI.
Verify directly, without a session:
```bash
curl -i -X POST localhost:4501/api/admin/order-status \
  -H 'content-type: application/json' -d '{"id":"x","status":"paid"}'
# expect: 401 Not signed in.

curl -i -X POST localhost:4501/api/admin/products \
  -H 'content-type: application/json' -d '{"name":"x","brand":"y"}'
# expect: 401 Not signed in.
```
Signed in as a **non-admin** user, the same calls must return `403 Forbidden.`
Only a `profiles.is_admin = true` user succeeds.

### e. "Not configured" fallback

With placeholder Stripe keys (the current `.env` state), the storefront must
stay fully usable and checkout must degrade gracefully:
```bash
curl -i -X POST localhost:4501/api/checkout \
  -H 'content-type: application/json' -d '{"lines":[{"slug":"any","qty":1}]}'
# expect: 503 with { error: "Checkout is not configured yet ..." }
```
Every other page (home, shop, product, stock endpoint) must return `200`.

## After schema changes

Run `get_advisors` (Supabase MCP, security + performance) and
`python C:\Users\mikef\.claude\skills\website-builder\scripts\security_audit.py .`
and clear what they flag. RLS must be on for every client-reachable table; the
service-role key is server-only and must never reach the browser bundle.
