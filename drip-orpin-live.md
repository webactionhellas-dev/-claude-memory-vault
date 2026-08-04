---
name: drip-orpin-live
description: "The LIVE drip-store-orpin.vercel.app store — source folder, connected Supabase backend, and how edits reach the site"
metadata: 
  node_type: memory
  type: project
  originSessionId: 27e58477-d5f1-460c-8c83-323163882dc2
---

**https://drip-store-orpin.vercel.app** is the owner-facing LIVE DRIP store (bilingual EN/GR, "We don't sell sneakers, we sell culture."). It is a SEPARATE deploy from [[drip-astro-store]]'s `drip-store-preview.vercel.app`.

**Source folder = `C:\Users\nospa\claude projects\_previews\drip-astro`** (identified by its footer address "Kassaveti 4, Kifisia 145 62, Athens" / "Κασσαβέτη 4, Κηφισιά" — the ONLY folder with that string). Astro 5; `astro.config.mjs` uses the **netlify** adapter locally but the live site runs SSR on Vercel. No local `.vercel` link in the folder; likely deployed via the Claude→Vercel integration (`deploy_to_vercel` MCP) — the auto-named `-orpin` suffix fits. The Vercel MCP token (team `webactionhellascom`) shows NO projects, so orpin is likely a personal Vercel account the MCP can't see → redeploys need the owner to grant Vercel access.

**Backend is REAL and CONNECTED (not the inert static preview the older memory implies):**
- Supabase project **`ocszztflphqsaoyhlerx`** ("webactionhellas-dev's Project", eu-west-1) is wired into the live deploy (env vars set in Vercel, incl. the SERVICE ROLE key — confirmed because storefront reads reflect DB edits).
- Tables: `products` (311 rows, has extra cols `variants`/`shopify_product_id`/`plate_color`), `inventory` (3861 per-size rows), `profiles` (**1 admin exists**), `orders`/`order_items` (0 rows). Shopify-synced at some point.
- All storefront pages are `prerender=false` SSR → `loadCatalog()` reads the DB live (falls back to static `products.json` only if service-role key absent). **Verified end-to-end 2026-07-08:** changed prices in the DB and the live PDP/homepage updated immediately. So **the owner's /admin edits (products, stock, prices, sales) appear on the live site with no redeploy.** `/admin` is gated (302 → /login when signed out).
- Editing product data = pure Supabase SQL/admin, NO code deploy. Editing layout/sections (homepage, footer) = code change in the folder + Vercel redeploy.

**Work done 2026-07-08 (owner instructions):**
- **StockX-ballpark repricing** of all 302 non-"Drip Exclusive" products via one `update…from(values…)` (map/backup in scratchpad `gen_reprice.mjs` / `price_backup_revert.sql`). "Drip Exclusive" brand (9 items, €40–115: Labubu/Crybaby/Drip hoodies) intentionally UNCHANGED. Prices are approximate market ballparks from knowledge (owner fine-tunes exact numbers in /admin); many were LOWERED to real market (Yeezys, LeBron 950→280, Dior 15000→7000).
- **Cleared all 125 synthetic discounts** (`compare_at_price=null` everywhere) → nothing on sale by default; owner adds sales in /admin and they surface on `/shop?category=sale`.
- **Removed the homepage "On Sale / Προσφορές" ProductRail** from `src/pages/index.astro` (+ dropped the `onSale` import). NOT yet deployed (waiting on Vercel access).

**DEPLOY RECIPE (I CAN redeploy orpin myself — no owner access needed):** the Vercel CLI on this machine is authenticated as `webactionhellas-dev`, and the orpin site = Vercel project **`drip-store`** (`prj_wLSkmsfdIpNOnQTrY3Ev88o5LInD`, team `webactionhellascom`/`team_fAnVpAdOPwPZAR4kW0o2BwID`), production alias `drip-store-orpin.vercel.app`. Steps: (1) in `_previews/drip-astro`, set `astro.config.mjs` adapter to `vercel({ imageService: true })` — NOT netlify (the committed config kept flipping to netlify; imageService REQUIRED for the SSR homepage `<Image>`s); (2) `vercel link --yes --project drip-store --scope webactionhellascom`; (3) `vercel deploy --prod --yes --scope webactionhellascom` (builds REMOTELY with the project's env vars, so no local env/prebuild needed; `.env`/`.env.production` are gitignored so placeholders never ship; auto-aliases to orpin). Preview deploys are SSO-protected (curl → vercel sso wall) so verify on the public prod URL. Node 24→22 warning is benign. The auto-mode classifier may block `--prod` as a "production deploy" — needs user go-ahead.

**DEPLOYED 2026-07-08 & VERIFIED LIVE:** removed homepage On Sale offer section; `ProductRail.astro` now renders nothing when 0 products AND hides its arrows unless the rail actually overflows (fixes "useless arrows" on empty rails); StockX repricing + cleared sales already live via DB. Live checks passed: `/login` 200 + "Owner sign-in" form (the reported "page not found" was a STALE deploy/cache — fresh deploy fixed it), no On Sale rail, 0 discount badges, LeBron €280 from DB, `/admin`→`/login`.

**Still open:** footer real contact info (address/phone/email/socials still placeholders — Kassaveti 4 Kifisia, +30 212 121 2147, hello@drip.store); waiting on the owner's real details. Footer Help links (Authentication/Shipping/Returns/Size Guide) ALREADY point to working `/about#authentication` etc. anchors. Owner already has the existing admin login (confirmed by user).
