---
name: cloudskin-content-studio
description: CLOUDSKIN Content Studio — owner-facing CMS at cloudskin.com/studio for editing site texts + images (Supabase-backed)
metadata: 
  node_type: memory
  type: project
  originSessionId: 72c1fd5a-be2b-4bb5-aec2-12b90a6a623d
---

Custom, owner-friendly CMS so Larissa can edit the CLOUDSKIN site's **marketing texts + images** herself (product data stays editable in Shopify admin — this is only for the homepage/editorial content). Built 2026-07-12 for [[cloudskin-shopify-integration]]. Source in `claude projects/cloudskin-live-fix` (the LIVE cloudskin.com store project).

**URL: https://cloudskin.com/studio** (studio.html; cleanUrls serves it, no coming-soon gate on it). **Studio password: `CloudskinStudio1`** (tell the owner; can be changed by updating `public.studio_secret` — it's a bcrypt hash via pgcrypto).

**Backend = the existing Supabase project `ocszztflphqsaoyhlerx`** ("webactionhellas-dev's Org", eu-west-1; same account as everything else). Keys are public/embedded in `js/supabase-config.js` (url + legacy anon JWT). Tables/functions (migrations `cloudskin_content_studio` + `cloudskin_content_table`):
- `public.cloudskin_content` (key text PK, value text, updated_at) — stores BOTH text overrides and images (images = client-side-resized JPEG **data-URLs**, base64, max 1500px). RLS: public SELECT; **no public write**.
- `public.studio_secret` (id, pass_hash) — bcrypt hash of the studio password. RLS on, no policies (anon fully blocked).
- RPC `studio_auth(p_password) -> bool` and `studio_save(p_password, p_items jsonb) -> void`, both **SECURITY DEFINER**, password-checked server-side, granted to anon. Writes go ONLY through studio_save (password-gated) — the anon key can't write the table directly.

**Files:** `studio.html` + `js/studio.js` (the editor: password unlock → sectioned form, text fields + image upload with client-side resize + live preview → Save; tracks pending changes). `js/content.js` (loaded on home.html after supabase-config.js; fetches cloudskin_content on load and applies overrides to `[data-content]` text + `[data-content-img]` images, re-applies after 400ms to beat late i18n/shell renders). `js/supabase-config.js` now has real url+anonKey (was empty). Assets at `?v=26`.

**Editable fields (v1)** — marked in home.html with `data-content` / `data-content-img`: hero image + tagline, collection-banner image + heading, editorial image + heading + copy, statement line1/line2/copy ("Quiet Luxury / Active Living"), Instagram heading. To add more editable fields later: add `data-content="key"`/`data-content-img="key"` to the element + add the field to `FIELDS` in studio.js (matching key + default).

**Product-page text (added 2026-07-15, verified locally):** the Studio now also edits every product page's copy. New shared source of truth `js/product-content.js` (`window.CLOUDSKIN_PDP` = CARE list, FIT_TRAILING, SHIPPING, SHIPLINE, and PRODUCTS keyed by handle with title/desc/features/fit/fabric — moved verbatim out of product.js so the two never drift). studio.js adds a **"Product text"** section (product-picker `<select>` → desc / feature bullets one-per-line / fabric / fit type / fit copy, keys `product.<handle>.desc|.features|.fabric|.fit.type|.fit.copy`) and a **"Shared product details"** section (keys `pdp.care | pdp.fit.trailing | pdp.shipping | pdp.shipline`). product.js reads these keys from cloudskin_content AFTER first paint and swaps only the fields the owner actually edited — **purely additive: with no overrides the PDP is byte-identical to before** (owner-approved look preserved). Loaded via `<script src="js/product-content.js">` before product.js (product.html) and before studio.js (studio.html). Same studio_auth/studio_save RPCs + cloudskin_content table; no DB/schema change. NOTE: as of this edit the change is LOCAL in `cloudskin-live-fix` only — **not yet deployed** to the live cloudskin Vercel project. Cache-Control is `max-age=0, must-revalidate` so no `?v=` bump needed on deploy.

**Known v1 limits (documented for next iteration):** (1) **i18n** — an override applies to ALL languages (single `value`), so an edited field shows the owner's English text to Greek/other visitors too; per-language editing not built yet. (2) **Images are base64 in the DB** (simple + fully password-gated, no storage bucket/edge-function) — fine for a handful of marketing images but not for many/large ones; migrate to Supabase Storage + a password-gated edge function if image count grows. (3) About-page fields not wired yet (only homepage). Verified end-to-end on preview + live: unlock → edit → save → site applies the override.

**NOTE:** the same Supabase project also has DEFUNCT tables from the earlier (abandoned) Supabase e-commerce/CMS scaffold — `orders, order_items, inventory, products, profiles, site_content` (site_content has en/el columns, no image column, unused). Left untouched. The store is **headless Shopify**, not Supabase, for commerce.
