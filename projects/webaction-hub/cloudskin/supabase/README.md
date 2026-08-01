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

## PayPal checkout rail (Echo, 2026-07-28) — STAGED, not yet live

A second payment rail feeding the SAME Shopify order pipeline as Stripe. Built to
fix the exact class of bug the Stripe-only history above describes (two divergent
copies of the Shopify-order logic): `_shared/fulfillment.ts` is now the ONE code
path both `stripe-webhook` and the PayPal handlers call after a payment is
confirmed, and `_shared/shipping.ts` is the ONE source of the shipping-threshold
math both `create-checkout-session` and `create-paypal-order` use. The
`functions/_shared/` tree below (money.ts, shopify.ts, etc.) is now the SINGLE
canonical copy — the old `functions/stripe-webhook/_shared/` staging dance
described further down is OBSOLETE now that `stripe-webhook`'s `index.ts` has been
refactored to import `fulfillPaidOrder` instead of bundling its own `shopify.ts`.

**New files:**
- `functions/_shared/shipping.ts` — PURE (`SHIP_DEFAULTS`/`SHIP_COUNTRIES`/
  `computeShipping`/`isShippableCountry`), unit-tested (`tests/shipping.test.ts`).
- `functions/_shared/rates.ts` — the Deno adapter half of `fx.ts` (`STATIC_RATES` +
  `loadRates()`), hoisted so both rails share one FX fallback table.
- `functions/_shared/paypal-amount.ts` — PURE PayPal amount/breakdown math +
  `PAYPAL_SUPPORTED_CURRENCIES` (verified against developer.paypal.com 2026-07-28
  — **AED is NOT supported**, unlike Stripe). Unit-tested (`tests/paypal-amount.test.ts`).
- `functions/_shared/paypal.ts` — OAuth token (cached), Orders v2 create/get/
  capture, and `verifyPayPalWebhookSignature` (uses PayPal's own verify-signature
  API rather than hand-rolled cert-chain verification — see the file's header for
  why that is the more defensible choice here).
- `functions/_shared/paypal-checkout.ts` — `completePayPalOrder()`, the ONE verify
  + capture + fulfil function both `capture-paypal-order` and `paypal-webhook` call.
- `functions/_shared/fulfillment.ts` — `fulfillPaidOrder()`, the ONE post-payment
  Shopify-order-creation function both `stripe-webhook` and the PayPal rail call.
- `functions/create-paypal-order/` — mirrors `create-checkout-session` (same CORS/
  rate-limit/re-pricing/shipping seam), converts the AED-priced cart into
  `PAYPAL_ORDER_CURRENCY` (default `usd`) via the shared FX seam since PayPal
  cannot receive AED, records a `payment_provider='paypal'` row in the SAME
  `stripe_orders` ledger. `GET` (no body) serves the frontend's public config
  (client id + currency) gated on a real token fetch succeeding, plus
  `?diag=PAYPAL_ENV_CHECK` (health check: tries both PayPal hosts, never moves
  money).
- `functions/capture-paypal-order/` — thin HTTP wrapper around
  `completePayPalOrder()`, called by the browser's Smart Buttons `onApprove`.
- `functions/paypal-webhook/` — the async safety net (`PAYMENT.CAPTURE.COMPLETED`
  / `CHECKOUT.ORDER.APPROVED`), idempotent via `paypal_events`, also calls
  `completePayPalOrder()`.
- Frontend: `../js/checkout-paypal.js` — self-gating (renders nothing unless the
  GET config call returns `ok:true`), PayPal Smart Buttons in the cart drawer +
  add-bag panel beside the existing Stripe button. `../js/i18n-strings.js` gained
  `checkout.or` (natively translated, all 11 languages). `../css/main.css` gained
  `.paydivider` / `.paypal-slot`.

**Schema (migration `20260728120000_paypal_checkout.sql`, additive, APPLIED
2026-07-28):** `stripe_orders` gained `payment_provider` (default `'stripe'`,
check `in ('stripe','paypal')`), `paypal_order_id`, `paypal_capture_id` (partial
unique indexes); new table `paypal_events` (idempotency ledger, same
service-role-only posture as `stripe_events`). No existing column touched.

**PayPal environment: LIVE credentials, currently INERT.** `PAYPAL_CLIENT_ID` /
`PAYPAL_CLIENT_SECRET` are already set as Supabase function secrets, and were
confirmed via `?diag=PAYPAL_ENV_CHECK` to be **LIVE** PayPal credentials (not
sandbox — PayPal has no sandbox credentials configured for this account at all).
`PAYPAL_ENV` defaults to `'sandbox'` (the safe house default, mirrors "test mode
first" for Stripe), which means the deployed functions currently 503 on every
real call — verified live (`GET create-paypal-order` returns
`{"ok":false,"error":"PayPal is not configured yet."}`, `POST` returns 503
`paypal_unconfigured`). **Nothing will actually work, and no button will render
on the frontend even if it is deployed, until Mike explicitly sets
`PAYPAL_ENV=live`** — a deliberate go-live action, exactly like flipping Stripe
keys from test to live.

**Still needed before Mike can test PayPal end to end (all external, dashboard-only):**
1. `PAYPAL_ENV=live` (Supabase function secret) — the explicit go-live flag.
2. `PAYPAL_ORDER_CURRENCY` — confirm which currency Larissa's PayPal Business
   account actually receives into (PayPal does not support AED; `usd` is the
   house default but MUST be confirmed against her account, not assumed).
3. Register a PayPal webhook (developer.paypal.com → the app tied to the stored
   client id → Webhooks → add
   `https://ocszztflphqsaoyhlerx.supabase.co/functions/v1/paypal-webhook`,
   events `PAYMENT.CAPTURE.COMPLETED` + `CHECKOUT.ORDER.APPROVED`), then set
   `PAYPAL_WEBHOOK_ID` (the id PayPal assigns that webhook, NOT a secret value —
   `verifyPayPalWebhookSignature` fails closed without it).
4. Deploy the frontend (`js/checkout-paypal.js` + the shell.js/i18n-strings.js/
   main.css changes, `?v` already bumped to 73) via `node scripts/deploy.mjs`,
   gated on Mike's go like every other CloudSkin deploy.
5. The Stripe-side refactor (`create-checkout-session`, `stripe-webhook` now
   import the shared modules above instead of their own copies) is STAGED in
   this repo but NOT redeployed to the live Supabase project this session —
   behavior-preserving (see the `2026-07-28 REFACTOR` comments in both files),
   verified against `tests/shipping.test.ts` + `tests/fx.test.ts`, but a
   redeploy of the currently-live Stripe functions needs Mike's explicit go
   since it touches the production payment path. Deploy both together once
   approved (they must move as a pair since `create-checkout-session` no longer
   bundles its own `SHIP_COUNTRIES`/`STATIC_RATES`).
6. Real end-to-end test: since the stored credentials are LIVE (not sandbox),
   the final certification is a REAL PayPal payment — mirror how Larissa's
   AED-1 Stripe test was the live certification for that rail. Decide the
   amount/product and who executes the approval step with Mike before running it.

## Full edge function inventory (deploy-from-scratch)

The bundle ships all eight live functions plus `dhl-track` (built, pending its DHL
key and a first deploy), PLUS the three staged PayPal functions above. The money
path shares `functions/_shared/`, which holds `create-checkout-session`'s exact
deployed snapshot (also what the money-path unit tests import). `stripe-webhook`
deployed a DIVERGENT `_shared/` in production historically, so its exact snapshot
was preserved under `functions/stripe-webhook/_shared/` and had to be staged over
`functions/_shared/` before deploying `stripe-webhook` — **this staging step is now
OBSOLETE** (see the PayPal section above: `stripe-webhook` no longer bundles its
own `shopify.ts`, it imports `_shared/fulfillment.ts` like everything else). The
`functions/stripe-webhook/_shared/` folder is kept on disk as a historical
reference only; do not stage it over `functions/_shared/` again. (Original note
retained below for the pre-refactor deploy history; see the
deploy note under the table). The other seven functions are single-file
`index.ts`. Deploy each with the flag shown. "Public" functions run
with `--no-verify-jwt` and do their OWN auth (Stripe signature, Shopify HMAC,
studio password, admin query token, or nothing). The two marked JWT keep the
default Supabase gateway auth (a valid project JWT / anon key is required).

| slug | gateway | own auth | deploy |
| --- | --- | --- | --- |
| create-checkout-session | public | strict CORS + IP rate limit | `supabase functions deploy create-checkout-session --no-verify-jwt` |
| stripe-webhook | public | Stripe signature (STRIPE_WEBHOOK_SECRET) | `supabase functions deploy stripe-webhook --no-verify-jwt` |
| cloudskin-notify | public | honeypot + per-IP rate limit + recent-user check | `supabase functions deploy cloudskin-notify --no-verify-jwt` |
| cloudskin-order-webhook | public | Shopify HMAC (SHOPIFY_WEBHOOK_SECRET) | `supabase functions deploy cloudskin-order-webhook --no-verify-jwt` |
| studio-upload | verify_jwt=true | studio password via studio_auth RPC | `supabase functions deploy studio-upload` |
| shopify-oauth-callback | public | Shopify OAuth code exchange | `supabase functions deploy shopify-oauth-callback --no-verify-jwt` |
| reprice-aed | public | admin query token `?go=REPRICE_AED` (dry-run by default) | `supabase functions deploy reprice-aed --no-verify-jwt` |
| shopify-token-test | verify_jwt=true | disabled diagnostic (returns 410 Gone) | `supabase functions deploy shopify-token-test` |
| dhl-track | public | read-only DHL tracking proxy; DHL_API_KEY server-side (pending DHL activation) | `supabase functions deploy dhl-track` |
| create-paypal-order | public | strict CORS + IP rate limit; **DEPLOYED 2026-07-28, inert (PAYPAL_ENV=sandbox default, stored creds are live)** | `supabase functions deploy create-paypal-order --no-verify-jwt` |
| capture-paypal-order | public | order must match a row this project created (payment_provider='paypal'); **DEPLOYED, inert** | `supabase functions deploy capture-paypal-order --no-verify-jwt` |
| paypal-webhook | public | PayPal verify-webhook-signature API (PAYPAL_WEBHOOK_ID); **DEPLOYED, fails closed (no PAYPAL_WEBHOOK_ID set yet)** | `supabase functions deploy paypal-webhook --no-verify-jwt` |

Deploy note (stripe-webhook `_shared`) — **HISTORICAL, OBSOLETE as of the
2026-07-28 PayPal refactor, kept for context only:** `create-checkout-session`
used to deploy directly against `functions/_shared/` (its exact snapshot) while
`stripe-webhook`'s deployed `_shared/` diverged (EUR base default; `send_receipt`
/ `send_fulfillment_receipt` true), preserved under
`functions/stripe-webhook/_shared/` and staged over `functions/_shared/` before
each `stripe-webhook` deploy, then restored. This dance is GONE: `stripe-webhook`
no longer bundles a `shopify.ts` at all — it imports `_shared/fulfillment.ts`,
the same canonical module `create-checkout-session` and the PayPal functions use.
Deploy `stripe-webhook` the normal way now (no staging step) once its refactor
(staged, not yet deployed — see the PayPal section above) is approved and pushed.

Note: the `studio-upload` source comment says "verify_jwt=false" but the LIVE
deployment is `verify_jwt=true` (verified 2026-07-27). The comment is stale; the
source is copied verbatim, and the deployed flag above is authoritative. The
frontend calls it with the anon key in Authorization (which satisfies the gateway),
then the function enforces the studio password itself.

Per-function secrets (all resolve from Supabase function secrets first, then the
`app_secrets` table; SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected):

- cloudskin-notify: `RESEND_API_KEY` (required to send), optional `EMAIL_TO`,
  `EMAIL_FROM`, `EMAIL_FROM_WELCOME`.
- cloudskin-order-webhook: `SHOPIFY_WEBHOOK_SECRET` (HMAC verify).
- shopify-oauth-callback: `SHOPIFY_APP_CLIENT_SECRET` (in app_secrets); writes the
  resulting `SHOPIFY_ADMIN_TOKEN` back into app_secrets.
- reprice-aed: `SHOPIFY_ADMIN_TOKEN` (from app_secrets). One-off AED re-base tool.
- studio-upload: none beyond the auto-injected service role; uploads to the
  public-read Storage bucket `product-media` (create it first: a public bucket,
  8 MB file-size limit, no anon/authenticated write policy).
- shopify-token-test: none (disabled).

See `.env.example` for every key with descriptions. No secret VALUES live in the repo.

## Database baseline (deploy-from-scratch)

Two migrations rebuild the backend a from-scratch `supabase db push` needs:

1. `20260701000000_cloudskin_core_objects.sql` - the PRE-EXISTING objects the
   functions + site depend on, reconstructed faithfully (read-only) from the live
   project because they had no migration: `app_secrets`, `cloudskin_content`,
   `newsletter_signups`, `customer_orders` (the cloudskin-order-webhook target),
   `studio_secret`, `studio_auth_throttle`, and the SECURITY DEFINER RPCs
   `studio_verify` / `studio_auth` / `studio_save` / `studio_delete`, with their
   exact RLS policies, indexes, grants, and the pgcrypto dependency. Idempotent.
   After it runs, seed the studio password + secrets (template at the bottom of the
   file). It is timestamped before the Stripe migration because these objects predate it.
2. `20260726100000_stripe_checkout.sql` - the Stripe order tables, idempotency
   ledger, rate-limit table + RPC, RLS, indexes (unchanged).

Tables the money webhooks write to, and where they live:
- stripe-webhook -> `stripe_events`, `stripe_orders`, `stripe_order_items`
  (migration 2). cloudskin-order-webhook -> `customer_orders` (migration 1).
