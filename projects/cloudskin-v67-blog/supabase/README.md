# CloudSkin custom Stripe checkout, backend (Echo)

Pre-built and reviewable. Nothing here is applied to the live project or deployed
until a separate, approved go-live. The live Shopify hosted checkout keeps working
as the fallback until the feature flag is flipped.

## What this is
A Supabase Edge Function checkout that charges in the customer's own currency
(Goal A) with duties-inclusive prices (Goal B), replacing the EUR-only Shopify
redirect. Money is always decided server-side; the browser never sends a price.

- `migrations/20260726100000_stripe_checkout.sql` - `stripe_orders`,
  `stripe_order_items`, `stripe_events` (idempotency ledger), a per-IP rate-limit
  table + RPC, RLS, and indexes. Dedicated `stripe_*` namespace: it does not touch
  the live `orders` / `customer_orders` tables.
- `functions/create-checkout-session/` - validates the cart, re-fetches
  authoritative variant prices from Shopify, re-prices server-side, records a
  pending order, creates a Stripe Checkout Session, returns the redirect URL.
- `functions/stripe-webhook/` - verifies the Stripe signature, is idempotent on
  the Stripe event id, marks the order paid (single source of truth), and syncs
  the order into Shopify for fulfilment (graceful if the Admin token is missing).
- `functions/_shared/` - `pricing.ts` + `fx.ts` + `money.ts` are PURE and
  unit-tested (`node --test tests/`); `shopify.ts`, `stripe.ts`, `env.ts`,
  `cors.ts` are the Deno adapters.
- Frontend: `../js/checkout.js` (feature-flagged) + a 2-line delegation guard in
  `../js/shell.js`. Flag defaults OFF, so the live site is unchanged.

## Presentment mode (Goal A)
- `adaptive` (default, recommended): line items are priced in the store base
  currency; Stripe Adaptive Pricing (a Dashboard toggle) presents and charges the
  buyer's local currency and owns the FX. No FX math in our code.
- `manual`: the session currency is set to the customer's selected currency and
  amounts are converted via `_shared/fx.ts` from an injected rate table
  (`FX_RATES_URL`, or the static fallback). Falls back to adaptive if a rate is
  missing so a wrong amount is never charged.

## Unit tests (no secrets, run anywhere)
```
node --test tests/money.test.ts tests/fx.test.ts tests/pricing.test.ts
```
Covers the tampered-cart attack (client price ignored), unknown/out-of-stock
drops, quantity clamping, Stripe minor-unit math (zero/two/three-decimal), and FX.

## ACTIVATION CHECKLIST (once keys arrive; do each in order)
1. Owner adds `webactionhellas@gmail.com` to Stripe; get `sk_test_...` +
   `pk_test_...` (test mode first). Enable Adaptive Pricing in Stripe Dashboard →
   Settings → Payments → Checkout (for `adaptive` mode).
2. Apply the migration on a **dev branch first**:
   `supabase db push` (or the SQL editor) against a branch, then
   `get_advisors(security)` + `get_advisors(performance)` and clear anything new.
   (Expected: the two service-role-only tables show the benign "RLS enabled, no
   policy" INFO lint, identical to the existing `app_secrets`.) Then merge.
3. Set function secrets (test mode):
   `supabase secrets set --project-ref ocszztflphqsaoyhlerx STRIPE_SECRET_KEY=sk_test_... CHECKOUT_PRESENTMENT_MODE=adaptive STORE_BASE_CURRENCY=eur`
   (or insert rows into `app_secrets`).
4. Deploy the functions (both PUBLIC, no JWT):
   `supabase functions deploy create-checkout-session --no-verify-jwt`
   `supabase functions deploy stripe-webhook --no-verify-jwt`
5. Register the webhook endpoint in Stripe →
   `https://ocszztflphqsaoyhlerx.functions.supabase.co/stripe-webhook`
   for events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`,
   `charge.refunded`. Copy the signing secret →
   `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
6. TEST end to end in Stripe TEST mode: on a Vercel preview (or localhost) set
   `localStorage.cloudskin_checkout_test = 'stripe'`, add to bag, check out with
   card `4242 4242 4242 4242`. Confirm: a `stripe_orders` row goes `pending→paid`,
   `stripe_events` has the event, a replay does not double-process, and (if the
   Shopify Admin token is set) the order appears in Shopify and mirrors into
   `customer_orders`. Bad-signature POST must return 400.
7. When ready: flip `STRIPE_CHECKOUT_ENABLED = true` in `js/checkout.js`, bump the
   `?v=` on the script tags, and deploy the site (`node scripts/deploy.mjs`,
   gated on Mike's go). Then swap to LIVE Stripe keys and re-run the webhook
   registration for the live endpoint.

## Shopify fulfilment sync
After payment the webhook creates the order in Shopify via the Admin API
(`write_orders`), which decrements inventory and enters fulfilment. Shopify then
fires `orders/create`, which the existing `cloudskin-order-webhook` mirrors into
`customer_orders`, so the account page order history keeps working with no extra
wiring. Without `SHOPIFY_ADMIN_TOKEN` the paid order is still recorded in
`stripe_orders` (status `paid`, `shopify_sync_status='skipped'`) and can be
backfilled: rows with `shopify_sync_status in ('skipped','failed')` are the queue.

## DDP (Goal B)
Prices are duties-inclusive (owner-set) and `automatic_tax` is off. The shipping
address is captured at Checkout. Per-product country of manufacture is a hook:
set `COUNTRY_OF_ORIGIN_MAP` (handle → ISO code) or wire a Shopify metafield in
`_shared/shopify.ts` (`originMap()`), pending the owner's data.
```
