# ACME — backend (Supabase + Stripe)

The storefront stays static/fast; only these server routes run on the Node adapter:
`/api/checkout`, `/api/stripe-webhook`, `/api/stock/[slug].json`, `/api/admin/order-status`,
`/login`, `/account`, `/admin`, `/checkout/success`.

## What's built
- **Stripe Checkout** (hosted, PCI-safe). Cart → `/api/checkout` creates an order + a Checkout
  Session → redirect to Stripe → `/checkout/success`.
- **Orders** in Supabase (`orders` + `order_items`), prices re-validated server-side.
- **Customer accounts** (Supabase Auth): `/login` (sign in / sign up), `/account` (order history, sign out).
- **Admin dashboard** (`/admin`): order list, revenue, status changes. Gated by `profiles.is_admin`.
- **Live inventory** (`inventory` table): per-size stock, sold-out sizes disabled on the product page,
  stock drawn down by the paid-order webhook.

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
5. **Make yourself admin** — sign up at `/login`, then in Supabase SQL editor:
   `update public.profiles set is_admin = true where email = 'you@example.com';`
6. **Run** — `npm run dev` (or `npm run build` then `node ./dist/server/entry.mjs`).

Test card: `4242 4242 4242 4242`, any future expiry / CVC / postcode.

Until keys are added, checkout returns a friendly "not configured" message and the rest of the
site works normally. **Not deployed anywhere** — this is local-only for the owner demo.
