---
name: cloudskin-office-session-20260805
description: "CloudSkin session 2026-08-05 (office, nospa) — NEWEST STATE, start here: real DHL negotiated rate card fully wired into Shopify+backend+frontend (10% Integrator Surcharge, volumetric/dimensional weight flooring, ~200-country zone map + SHIP_COUNTRIES expansion with explicit sanctions exclusion list), Athens/Dubai warehouse routing fixed in Shopify admin, all 6 money-path edge functions redeployed + verified live across every DHL zone, 100/100 tests passing, git fully synced to origin/main (home just needs git pull)"
metadata:
  node_type: memory
  type: project
  originSessionId: 4c963e55-2322-40ba-9d49-fc8141c33381
  modified: 2026-08-05T14:25:28.615Z
---

Continuation of [[cloudskin-office-session-20260729]] (read that for the blog pipeline / WordPress
headless-live state, unrelated to this session). Also relevant: [[cloudskin-stripe-golive]] (money-path
history), [[cloudskin-live-edit-reconstruction]] (source layout note — superseded: canonical office repo
is directly `C:\Users\nospa\cloudskin-v67`, git remote `webactionhellas-dev/cloudskin-v67` branch `main`).

## TRIGGER
Larissa's team (via Panos on WhatsApp) shared a Google Sheet with real Dubai-warehouse product weights
and box dimensions. Mike asked to make sure Shopify + backend + frontend all follow the real data, then
"go handle it" (explicit deploy authorization), then a final rigor check ("i need everything perfect are
you done?").

## DONE + VERIFIED + LIVE 2026-08-05
- **Real DHL negotiated rate card (not the public list-rate guide) is now the source of truth.** PDF:
  customer "Cloud Enterprise F.Z.E", Activation ID AE440253177-2203746340, ratecard as of 30-Jun-2026.
  Extraction gotcha: `pdftotext -layout` misaligns this PDF's tables (off-by-one-row + column bleed) —
  the only reliable method was rendering pages to 300dpi PNG via pdfplumber and reading them visually.
  The existing rate tables + 33-country zone map already deployed (from an earlier 2026-08-04 session)
  were re-verified byte-accurate — nothing wrong there. The real gaps were exactly two things:
  1. **10% Integrator Surcharge** (verbatim from the PDF's footnotes: "Non Document shipments up to
     30kg...subject to a 10% Integrator Surcharge", export AND domestic) was never applied anywhere.
     Confirmed against a real Larissa invoice (billed 134 AED vs the 71 AED flat rate). Added as
     `INTEGRATOR_SURCHARGE_RATE = 0.10` in `dhl-rates.ts`, applied once in `shipping.ts
     computeShippingByZone` at the point the customer charge is finalized (never baked into the raw
     rate-lookup functions, which stay pinned byte-for-byte to the card for testability).
  2. **Volumetric/dimensional weight was never computed at all** — the code priced purely off actual
     weight, but DHL bills the GREATER of actual vs volumetric (L×W×H(cm)/5000). Real box (from Clara's
     Dubai inventory checklist, matches Shopify's "Cloudskin box" package profile): 30×30×8cm →
     7,200cm³/5000 = **1.44kg**, well above the ~0.4-0.65kg actual weight of most single-item orders — so
     nearly every order was being under-quoted. Added `volumetricWeightKg()` + floored both
     `estimateWeightKg()` (itemCount-based preview estimate) and `realOrderWeightKg()` (real per-item
     Shopify weight) at this figure.
  - Also expanded `DHL_ZONE_BY_COUNTRY` + `SHIP_COUNTRIES` from a curated 33-country subset to the FULL
    real card (~200 territories), MINUS an explicit sanctions/embargo exclusion list (AF, BY, CU, IR, KP,
    LY, MM, RU, SD, SO, SS, SY, VE, YE) documented in `shipping.ts` as "a reasonable default list, not a
    legal determination" — **flagged for Mike to review as a business/compliance call, not settled**.
  - Fuel Surcharge wired as a configurable seam (`DHL_FUEL_SURCHARGE_RATE`, default 0) but NOT set to a
    real value — the PDF explicitly refuses to publish a fixed number ("Pls refer to DHL website for the
    prevailing Fuel Surcharge", updated weekly). **Needs Panos to supply the current rate.**
- **Athens/Dubai warehouse routing FIXED — was a Shopify config issue, not a code bug.** Orders were
  routing to Athens Warehouse for EU-ish destinations due to Shopify's Order Routing rules ("stay within
  destination market" etc). Fixed in Shopify admin: Settings → Shipping and delivery → General profile →
  removed Athens Warehouse from Fulfillment locations ("Don't ship from this location"). Dubai was already
  the default location.
- **Box dimensions fixed everywhere.** Shopify "Cloudskin box" package profile: 32×32×10cm/0.5kg →
  30×30×8cm/0.3kg (now matches the real sheet). Dormant `create-dhl-shipment` function's placeholder
  default also updated 30×25×10 → 30×30×8 (this function is confirmed NOT deployed live — 404 — so this
  fix is inert until Mike activates direct MyDHL booking, but it's now correct whenever that happens).
- **All 6 functions that transitively touch `shipping.ts`/`dhl-rates.ts` redeployed and verified**, found
  via a full dependency-graph grep sweep (not just the obvious top-level importers — `_shared/paypal-
  checkout.ts` importing `shipping.ts` was the one that would have been missed on a shallow check):
  `create-checkout-session` v27, `shipping-quote` v10, `create-paypal-order` v21, `create-checkout-
  elements` v16, `capture-paypal-order` v15, `paypal-webhook` v15.
  **`stripe-webhook` (v20) confirmed to NOT need this redeploy** — it never imports `shipping.ts`/
  `dhl-rates.ts` at all; it only recovers the shipping amount `create-checkout-session` already computed
  and stored, via `_shared/fulfillment.ts`. One minor, non-blocking gap found: `stripe-webhook`'s bundled
  `fulfillment.ts` is an OLDER copy lacking the fire-and-forget "trigger direct DHL shipment" hook that
  PayPal orders now get — harmless today (that whole feature is `DHL_DIRECT_SHIP_ENABLED=false` by default
  and its target function isn't deployed), but if Mike ever turns on direct DHL booking, Stripe-paid
  orders won't auto-trigger it until `stripe-webhook` gets a routine redeploy too.
- **Tests: 100/100 passing** (`node --test tests/*.test.ts` in `cloudskin-v67`), rewritten to assert the
  new (accurate) weight/surcharge behavior instead of the old under-quoted numbers.
- **Live-verified via direct curl against production `shipping-quote`** across all 6 real DHL zones + AE
  domestic + 2 sanctioned-country rejections + free-shipping threshold crossover + a large-cart bracket
  jump — every number hand-checked against the rate tables and matched exactly (e.g. Greece/Germany 75.63
  AED at zone 3, Australia 83.18 AED at zone 4, South Africa — newly zoned — 129.55 AED at zone 6, Russia/
  Iran correctly rejected with `country_required`).
- **Frontend redeployed:** all `?v=` cache-busting stamps bumped uniformly 76-79 → **80** across 167
  references in 11 files (the house cache-bust trap — see [[cloudskin-stripe-golive]]), `node
  scripts/deploy.mjs` succeeded (content snapshot deep-equals live, no-flash), aliased to www.cloudskin.com.
- **Git fully synced office↔home via the auto-sync mechanism** (an unrelated background process commits
  +pushes every ~10-20min as "Sync HH:MM"). Confirmed at session end: local HEAD `4f113e9` == `origin/main`
  `4f113e9`, working tree clean. **Home machine just needs `git pull` in `cloudskin-v67` — no manual file
  transfer needed**, unlike the earlier 2026-07-27 zip-handoff pattern (that was for content Supabase
  couldn't hold; this is pure source and IS git-tracked).

## FLAGGED, NOT AN INVENTORY/SHIPPING-CODE BUG (worth a warehouse check)
Elevate Cropped Jacket and Drift Cropped Jacket both have a purchasable XL variant live on Shopify, but
Larissa's Dubai sheet has no XL stock row for either. Either XL is genuinely 0-stock or it got missed in
the count — a warehouse question for Larissa/Panos, not something to "fix" in code.

## OPEN ITEMS (external, need Mike/Panos, not blocking)
1. **Real Fuel Surcharge %** — ask Panos; wire via `DHL_FUEL_SURCHARGE_RATE` config once known.
2. **Sanctions exclusion list review** — Mike should sign off on the 14-country exclusion list as a
   deliberate business decision, not just accept my reasonable-default framing.
3. `create-dhl-shipment` (direct MyDHL API booking) is still dormant/undeployed — box dimensions are
   correct in it now, but it needs Mike's explicit go to activate.
