# DRIP — backend (Supabase + Stripe)

## Environment variables: build-time vs runtime (read before touching env)

The local `.env` is the source of truth and is uploaded to Vercel as-is (do not change that flow).
What matters is WHEN each kind of variable is read:

- **`PUBLIC_*` (client-visible)** — inlined by Vite at BUILD time into the client bundle and any
  prerendered HTML (e.g. `PUBLIC_GA4_ID` decides at build whether the cookie banner exists at all).
  Changing one in Vercel does nothing until the next deployment BUILD.
- **Server-only vars** (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `RESEND_API_KEY`, `CRON_SECRET`, ...) — read inside the Vercel functions; treat them the same
  in practice: change in the project env, then REDEPLOY so every function picks them up. Nothing
  secret ever reaches the client bundle (verified by the security audit's bundle grep).
- Rule of thumb: **any env change on Vercel needs a redeploy; `PUBLIC_*` changes specifically need
  a fresh build**, not a promote/re-run of an old build.

The storefront is server-rendered on the Vercel adapter; these server routes run as functions:
`/api/checkout`, `/api/stripe-webhook`, `/api/stock/[slug].json`, `/api/admin/*`,
`/api/cron/*`, `/login`, `/admin`, `/checkout/success`.

## What's built
- **Stripe Checkout** (hosted, PCI-safe). Cart → `/api/checkout` re-prices every line
  server-side, pre-flight checks live stock (a clean 409 tells the shopper which sizes are
  short before any order or Stripe session exists), creates an order + a Checkout
  Session → redirect to Stripe → `/checkout/success`.
- **Guest-only checkout, by design.** Customers never create accounts; email is captured at
  Stripe Checkout. The owner sees every order in `/admin`. `/login` is the owner sign-in only
  (it has no sign-up form) and exists purely to reach the dashboard.
- **Orders** in Supabase (`orders` + `order_items`), prices re-validated server-side.
- **Admin dashboard** (`/admin`): order list, revenue, status changes. Gated by `profiles.is_admin`.
- **Live inventory** (`inventory` table): per-size stock, sold-out sizes disabled on the product page,
  stock drawn down exactly once by the paid-order webhook (idempotent, floored at 0).
- **Order emails** (Resend): on the first paid-webhook delivery the customer gets a branded
  bilingual (EL + EN) confirmation with items, total and shipping address, and the owner gets a
  plain new-order notification when `OWNER_NOTIFY_EMAIL` is set. Best-effort: without
  `RESEND_API_KEY` the webhook logs one line and skips; an email failure never fails the webhook.
  NOTE: an unverified Resend account only sends to the account owner's address and only from
  `onboarding@resend.dev`; the client domain's DNS verification happens at handover, then set
  `EMAIL_FROM` (e.g. `DRIP <orders@drip.store>`).
- **Coupon codes**: the Stripe Checkout page shows a promo-code field
  (`allow_promotion_codes: true`). The owner creates, limits and expires codes entirely in the
  Stripe dashboard; discounts land in `amount_total`, which is what the confirmation email shows.
- **Webhook lifecycle**: fulfilment is gated on `payment_status` (async payment methods leave the
  order pending until `async_payment_succeeded`; failures cancel it), `checkout.session.expired`
  deletes abandoned pending orders, and `charge.refunded` reconciles dashboard refunds (status
  flips to refunded, stock is NOT auto-restocked, the owner gets an alert). Registered endpoint
  events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`.
- **Shipped emails + tracking**: flipping an order to `fulfilled` in /admin emails the customer
  a branded bilingual shipped notice, with tracking number + courier link once the
  `tracking_number`/`courier` migration is applied (see scripts/sql/).
- **Refunds**: per-order full refund from /admin (Stripe refunds API, idempotency-keyed), optional
  restock (needs the `increment_inventory` migration), refund-confirmation email, status
  `refunded`.
- **Reconcile cron** (`/api/cron/reconcile`, every 6h, CRON_SECRET-guarded): orders stuck pending
  over 2h are checked against Stripe; paid ones run the exact same idempotent fulfilment path,
  expired ones are cleaned up, and the owner is alerted about each reconciled order.
- **301 redirect map** (`vercel.json`): the old Shopify URL scheme (`/products/*`, `/collections/*`,
  `/pages/*`, `/account*`, `/blogs/*`) permanently redirects to our routes; dormant until the
  domain points at us. Full frozen URL inventory: `scripts/data/shopify-url-inventory.json`.
- **CDN caching**: `/`, `/shop`, `/product/*` send `s-maxage=60, stale-while-revalidate=300`
  (stock badges stay live via the client-side no-store stock fetch); `/api/*` and `/admin*` uncached.
- **Cookie consent (dormant)**: the site sets no non-essential cookies today, so no banner shows.
  The bilingual consent banner + gated analytics loader ship ready in
  `src/components/CookieConsent.astro`; they activate the moment `PUBLIC_GA4_ID` is set (see below).

Supabase project: `ocszztflphqsaoyhlerx` (`https://ocszztflphqsaoyhlerx.supabase.co`).
Schema is already migrated (profiles, inventory, orders, order_items, RLS, triggers).

## Go live locally (≈10 min)
1. **Supabase service key** — dashboard → Project Settings → API → `service_role` → paste into
   `.env` as `SUPABASE_SERVICE_ROLE_KEY`.
2. **Stripe test keys** — dashboard (TEST mode) → Developers → API keys →
   `STRIPE_SECRET_KEY` (sk_test_…) and `PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test_…) in `.env`.
3. **Stripe webhook** — run `stripe listen --forward-to localhost:4501/api/stripe-webhook`,
   copy the `whsec_…` it prints into `.env` as `STRIPE_WEBHOOK_SECRET`.
4. **Seed stock** — `node --env-file=.env scripts/seed-inventory.mjs`
5. **Create the owner account** (there is no public sign-up):
   `node --env-file=.env scripts/create-owner.mjs you@example.com <password>`
   then sign in at `/login`.
6. **Run** — `npm run dev` (or `npm run build` then `node ./dist/server/entry.mjs`).

Test card: `4242 4242 4242 4242`, any future expiry / CVC / postcode.

Until keys are added, checkout returns a friendly "not configured" message and the rest of the
site works normally.

## Optional switches
- **Order emails** — create a Resend account, paste `RESEND_API_KEY` (starts with `re_`) into
  `.env`/Vercel. `EMAIL_FROM` defaults to `DRIP <onboarding@resend.dev>` until the client domain
  is verified in Resend. Set `OWNER_NOTIFY_EMAIL` to give the owner a new-order email.
- **Analytics + cookie banner** — set `PUBLIC_GA4_ID` (G-XXXXXXX). That single switch makes the
  bilingual consent banner render; GA4 loads only after the visitor clicks accept (choice
  persisted in localStorage as `drip-consent`). While it stays empty: zero banner, zero
  analytics, zero cookies. When activating in production also extend the CSP in `vercel.json`:
  add `https://www.googletagmanager.com` to `script-src` and
  `https://*.google-analytics.com https://www.googletagmanager.com` to `connect-src`.
