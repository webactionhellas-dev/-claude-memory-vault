# Web Action — Commerce Starter

A production-grade storefront starter: **Astro 5 + Supabase + Stripe**, de-branded from a real shipped
store. Catalog, cart, server-validated Stripe checkout, an idempotent webhook, per-size inventory, an
admin dashboard with analytics, Supabase auth, and an optional headless-Shopify sync. Security headers,
a GDPR consent banner, an authored database schema, and a security audit are wired in from the start.

It runs out of the box on **sample data** (no backend needed) so you can see it immediately, then you
connect a real Supabase project and Stripe account when you are ready.

## Stack
- **Astro 5** (mostly static, tiny vanilla-TS islands, no UI framework runtime)
- **Vercel adapter** (serverless for checkout, webhook, auth, admin, cron) + image optimizer
- **Supabase** (Postgres, RLS, auth, service-role for server writes)
- **Stripe** (hosted checkout + signed webhook)
- **Tailwind CSS v4**

## Quick start (sample data, no backend)
```bash
npm install
npm run dev      # http://localhost:4501  — runs on the sample catalog
npm run build    # production build (also runs on sample data with the dummy .env)
```
The bundled `.env` ships **dummy** values, so the store falls back to `src/data/products.json`
(6 sample products) until you connect a real backend. No secrets are included.

## Connect a real backend
1. **Create a Supabase project.** Copy the project URL, the anon/publishable key, and the service-role key.
2. **Apply the schema.** Run `supabase db push` (Supabase CLI) or paste `supabase/migrations/0001_init.sql`
   into the SQL editor. It creates `profiles`, `products`, `inventory`, `orders`, `order_items` with RLS
   on, plus the `decrement_inventory` RPC.
3. **Fill `.env`** with the real Supabase URL + keys, and Stripe TEST keys.
   `PUBLIC_*` are browser-exposed; the rest are server-only. Never commit real values.
4. **Seed the catalog:** `npm run seed` (loads the sample products + inventory into the DB).
5. **Create the owner/admin:** `npm run create-owner` (sets `profiles.is_admin = true`), then sign in at
   `/login` and manage orders at `/admin`.
6. **Stripe webhook (local):** `stripe listen --forward-to localhost:4501/api/stripe-webhook`, put the
   printed `whsec_...` in `STRIPE_WEBHOOK_SECRET`. Test card: `4242 4242 4242 4242`.

### Optional: headless-Shopify mode
Set `SHOPIFY_STORE_URL` to sync the catalog **from** Shopify (nightly cron + manual admin trigger) and
hand checkout to Shopify's hosted cart; admin product editing goes read-only. Empty = standalone
(Supabase + Stripe own everything).

## Security (baked in)
- **Headers** in `vercel.json`: CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`. The CSP already allows Stripe, Supabase, and Google Fonts. It uses
  `'unsafe-inline'` for scripts/styles to support Astro's inline runtime; tighten with hashes or nonces
  before a high-security launch.
- **Server-side money:** checkout re-prices every line from the catalog; the client price is never trusted.
- **Signed webhook** with idempotent order + inventory updates.
- **RLS on** every table; service-role writes only; secrets are server-only.
- **GDPR:** a consent banner (`src/components/CookieConsent.astro`) and a `/privacy` placeholder. Fill the
  policy and controller details before launch.
- **Audit:** `python scripts/security_audit.py .` runs the deterministic security checks (secret scan,
  `.env` hygiene, headers, XSS surface, `npm audit`). Run it before every deploy.

## Deploy (Vercel)
Import the repo, set the env vars for each environment (preview + production separately), and set a strong
`CRON_SECRET`. Set the real domain in `astro.config.mjs` (`PUBLIC_SITE_URL`) for canonical URLs and the
sitemap. Deploy to **preview first**; promote to production only on an explicit go.

## Start a new store from this template
1. Copy this folder and rename it. `npm install`.
2. New Supabase project + `0001_init.sql` + `.env`.
3. Swap branding: the design tokens in `src/styles/global.css`, the copy in the components/pages
   (search for the `ACME` / `Acme` placeholders), the favicons in `public/`, and the OG image.
4. Replace `src/data/products.json` + `src/assets/products/` with the real catalog, or turn on Shopify sync.
5. Run the quality + security gates, then deploy to preview.

## Structure
```
supabase/migrations/0001_init.sql   # schema + RLS + inventory RPC (apply this first)
vercel.json                         # security headers
scripts/security_audit.py           # deterministic security gate
src/
  data/                 # sample catalog (products.json, meta.json) — replace with real data
  assets/products/      # placeholder photos — replace with real product images
  lib/                  # supabase, stripe, catalog, cart, products, money, store-config
  components/           # Header, Footer, ProductCard, CartDrawer, QuickView, CookieConsent, admin/
  pages/                # storefront + product/[slug] + admin/* + api/* (checkout, webhook, cron)
  layouts/BaseLayout.astro
```

Placeholders are labeled. Nothing here contains real keys, catalog, or client images.
