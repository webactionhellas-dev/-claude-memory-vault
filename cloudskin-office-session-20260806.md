---
name: cloudskin-office-session-20260806
description: "CloudSkin session 2026-08-06 (launch night) — NEWEST STATE, start here: real per-country duty/VAT live on all 4 checkout functions (see [[cloudskin-duty-vat-system]]), Stripe webhook signing-secret silently drifted causing paid orders to never reach Shopify/DHL — found, fixed, and a permanent reconciler safety net built (see [[stripe-webhook-secret-drift-lesson]]), checkout page now displays duty as its own line so shown total matches actual charge, size-availability system audited and confirmed already working correctly (see [[cloudskin-inventory-live-availability]])"
metadata:
  node_type: memory
  type: project
  originSessionId: 05f8ccf6-9d93-4373-8068-ecf7f961d3e2
  modified: 2026-08-06T13:50:11.884Z
---

Continuation of [[cloudskin-stripe-golive]] / [[cloudskin-office-session-20260729]]. Source repo now
`C:\Users\nospa\cloudskin-v67` (this machine's canonical folder as of tonight — confirm this is still current
in a fresh session, folder names have moved before, e.g. cloudskin-v56 → cloudskin-v67). Supabase project
`ocszztflphqsaoyhlerx`. Deploy = `node scripts/deploy.mjs` from that folder for frontend/static changes;
Supabase edge functions deploy separately via the Supabase MCP `deploy_edge_function` tool (see the pattern
notes in [[stripe-webhook-secret-drift-lesson]] for the exact file-bundling gotchas).

## DONE + VERIFIED + LIVE 2026-08-06

**1. Real per-country duty + VAT, live on all 4 checkout paths.** Full technical detail, the exact 32-country
table, sourcing, and every deliberate exclusion is in [[cloudskin-duty-vat-system]] — read that before touching
`_shared/duty-rates.ts` again. Short version: `create-checkout-session`, `create-checkout-elements`,
`create-paypal-order`, and `shipping-quote` all compute real duty+VAT and add it as its own line item
("Import duties & taxes"), verified live via a real Stripe session (France: 353 AED subtotal → 112.96 AED
duty, total 564.02 AED, math confirmed against the DB row). GCC treated as real-duty destinations (Mike's
explicit call, since he didn't know the customs regime — safer-for-Larissa default). Turkey included on
explicit override despite a flagged volatility risk. US/Canada/Lebanon deliberately still excluded (structurally
impossible to pin one honest number, not a guess-avoidance laziness call).

**2. Checkout page duty display FIXED — this was a real, launch-night-discovered bug.** Before tonight,
`js/checkout-page.js`'s on-page order summary added `subtotal + shipping` only — never the duty amount —
even though the ACTUAL Stripe/PayPal charge always included it once (1) shipped. So for any of the 32 covered
countries, the customer saw a lower total on `/checkout` than what they were actually charged at payment,
directly contradicting `legal.js`'s own promise ("the amount charged is the amount shown at checkout"). FIXED:
`refreshShipQuote()` now reads `data.dutyVatMajor` from the `shipping-quote` response, folds it into the
displayed total, and shows a new `#coDutyRow` line ("Duties & taxes", i18n key `cart.dutiesTaxes`, added
natively in all 11 languages) only when non-zero. Deployed, confirmed live via direct fetch of the deployed
`js/checkout-page.js` (grep for `coDutyRow`/`dutyVatMajor` — present).

**3. STRIPE WEBHOOK SIGNING-SECRET HAD SILENTLY DRIFTED — real incident, found + fixed + hardened.**
Larissa reported a completed payment never showed up in DHL. Root cause: `stripe-webhook`'s stored
`STRIPE_WEBHOOK_SECRET` no longer matched what Stripe was actually signing with (Stripe never re-exposes a
secret after creation, so this class of drift is invisible until something breaks — not caused by anything
touched tonight, pre-existing, timing unknown). Every real webhook delivery was 400ing on signature
verification, so paid orders never flipped to 'paid' and never reached Shopify. Full incident detail, the
exact fix, and the NEW permanent safety net (`stripe-pending-reconciler`, cron every 15 min) is in
[[stripe-webhook-secret-drift-lesson]] — this is a reusable house lesson, not just a CloudSkin one-off.
**One real customer order was stuck**: Kimberley Thomson, Australia, order #1009 — reconciled manually,
confirmed landing live in DHL Express Commerce's "New" queue (screenshot-verified by Mike).

**4. `stripe-webhook` was ALSO running 3.6-day-stale shared code (separate finding, also fixed).**
While fixing the secret, found `stripe-webhook`'s bundled `_shared/fulfillment.ts` was an older copy than
`capture-paypal-order`'s — missing a (currently dormant, harmless) direct-DHL-shipment trigger added since.
Redeployed `stripe-webhook` and the new `stripe-pending-reconciler` with the CURRENT canonical
`fulfillment.ts` so all fulfillment call-sites are now byte-identical again. `DHL_DIRECT_SHIP_ENABLED` is
NOT set anywhere (trigger is off) and its target function `create-dhl-shipment` doesn't even exist yet — a
paused/incomplete feature, not a live risk, left alone. PayPal's rail (`paypal-webhook`) verifies signatures
LIVE against PayPal's own API every time (no locally-cached secret), so it does NOT have this drift risk —
confirmed current and correct, no action needed there.

**5. `sync-catalog-from-shopify.mjs` fixed (built earlier this session, had a real bug on first run).**
The regex window between `"handle"` and `"colors"` was too narrow (50 chars) for the real file structure
(title + color fields sit in between) — fixed to 300 chars. ALSO scoped the script to **sizes only, deliberately
NOT colors**: `js/shopify.js`'s `normColor()` has an intentional "White Mist" (display) → "White" (Shopify's
real option value) rename, and the first script version proposed silently reverting that rename on every
product using it — would have undone a deliberate design decision, not fixed a bug. Verified: 15/15 real
products already in sync on sizes, 0 changes needed. Safe to re-run any time Larissa adds/removes a size
OPTION in Shopify (not for ordinary restocking — see next item).

**6. Size/inventory-availability system audited end-to-end, confirmed already working correctly.**
Larissa asked whether the frontend "tracks inventory correctly" (used Ace Dress size L as her example — but
Shopify currently has NO L variant at all for Ace Dress, only White/S and White/M, so her exact example
wasn't reproducible; she likely hadn't created it yet, or was recalling the earlier Elevate Cropped Jacket
XL sync-gap bug fixed earlier tonight). Full findings in [[cloudskin-inventory-live-availability]] — short
version: the site ALREADY has a real, site-wide (every product, not just Ace Dress), automatic mechanism
(`js/product.js`'s `syncAvailability()` + `js/shopify.js`'s `available()`) that greys out + strikes through
any size at 0 real Shopify stock on every page load/color change, and re-enables it automatically once
restocked — no developer action needed for ordinary restocking. Verified live against 2 real 0-stock
variants in the catalog (Elevate Cropped Jacket Black/XL, Drift Cropped Jacket White/XL) via the actual
public Storefront API — both correctly report `availableForSale: false`. Scanned all 80 variants store-wide:
**zero** have Shopify's "continue selling when out of stock" enabled (the one setting that could silently
break this mechanism) — so the mechanism is safe everywhere in the catalog right now, not just spot-checked.
**Caught Mike's browser showing a phantom "L" on Ace Dress live** — traced to a stale local browser cache
(confirmed by fetching the deployed `products.js` with a cache-busting query param: server truth is
`["S","M"]`, no L). **This is the SAME house trap already documented in [[cloudskin-stripe-golive]]
("bump ?v stamps uniformly or changes don't reach returning visitors") recurring** — worth checking whether
`products.js` itself is referenced via a `?v=` stamp on the product page HTML; if not, it may need one added
so future data corrections propagate to returning visitors without requiring a manual hard-refresh.

## KEY GOTCHA FOR THE NEXT SESSION
**Local repo (`C:\Users\nospa\cloudskin-v67`) vs. what's actually deployed can drift silently** — this bit
us twice tonight in different subsystems (`stripe-webhook`'s stale `fulfillment.ts`, and the Ace Dress
browser-cache confusion which turned out NOT to be a repo/deploy mismatch but looked like one at first).
**Always verify against the LIVE deployed artifact** (curl the real URL with a cache-buster, or
`get_edge_function` for Supabase functions) before trusting local file reads as ground truth, especially for
anything money- or inventory-critical.

## REMAINING / OPEN
- Canada real per-province GST/HST duty coverage — offered to build (real province-collection UI + rate
  table), not yet started, needs Mike's go-ahead on scope (see [[cloudskin-duty-vat-system]]).
- GCC de-minimis value thresholds (~USD 260-325 per country) are NOT modeled in the duty table — flat % is
  applied regardless of order value, so small GCC orders are conservatively over-charged duty rather than
  under-charged. Documented in the code, not fixed — revisit if GCC volume becomes material.
- Whether `js/products.js` needs a `?v=` cache-bust stamp added (see gotcha above) — not yet investigated,
  worth a quick check next session given the recurring house trap.
- Larissa's actual current operating-country list (whether all 39/32 `SHIP_COUNTRIES` are real) — still
  unconfirmed from earlier in this same session, no action taken, needs her direct confirmation.
