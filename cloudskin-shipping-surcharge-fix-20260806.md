---
name: cloudskin-shipping-surcharge-fix-20260806
description: "CloudSkin NEWEST state (2026-08-06), supersedes cloudskin-office-session-20260729: a full week of home work (Aug 2-5) built real DHL zone+weight-based shipping, live in prod since Aug 5 18:20; fuel surcharge still unconfigured (real gap vs DHL invoices); MyDHL direct-shipment-creation API built but gated on DHL approval, which landed 2026-08-06"
metadata: 
  node_type: memory
  type: project
  originSessionId: 05f8ccf6-9d93-4373-8068-ecf7f961d3e2
  modified: 2026-08-06T08:48:45.195Z
---

Picked up in an office session 2026-08-06 after Mike said "is everything synced" + relayed
Larissa's report that shipping surcharges aren't calculated and DHL invoices run higher than
charged. Investigated directly (git log + live Supabase `list_edge_functions` + `execute_sql`),
not from memory, because [[cloudskin-office-session-20260729]] was a week stale and missed all of
this. Source `C:\Users\nospa\cloudskin-v67`, confirmed git-synced office<->home (clean, HEAD
`b8081e9`, "Sync 2026-08-05 18:32" — home auto-commits every ~10-30min, no manual narration in
commit messages, so **always verify current state via git/live-Supabase, not commit messages**).

## Real shipping fix, already live (this IS the fix for Larissa's flat-rate complaint)
Old model: pure flat rate (AED 71 flat / free >=840), same charge to every destination regardless
of real DHL cost variance (6-10x by zone). Larissa flagged this as launch-blocking 2026-08-02.
Built in `supabase/functions/_shared/shipping.ts` + `dhl-rates.ts` + `dhl-transit.ts`:
- **Phase 1 (Aug 2):** zone-aware pricing off DHL's real published rate card, weight ESTIMATED
  from cart item count.
- **Phase 2 (Aug 3):** real per-product weight pulled from Shopify variant data (`weight`/
  `weightUnit` on the Storefront query) instead of the estimate.
- **Aug 4:** AE-domestic now uses DHL's real Domestic rate card (Zone A) instead of flat fallback.
- **Aug 5:** DHL's 10% **Integrator Surcharge** applied on top of the zone rate (confirmed against
  a real Larissa invoice) via `INTEGRATOR_SURCHARGE_RATE` in `dhl-rates.ts`.
- **DEPLOYED to prod 2026-08-05 ~18:18-18:22** (`create-checkout-session` + `shipping-quote`,
  verified via Supabase `list_edge_functions` updated_at timestamps). So as of last night the
  "everything is flat rate" problem is fixed.

**REMAINING REAL GAP (likely why she still sees invoices higher than charged):** DHL also bills a
**Fuel Surcharge** — a % DHL updates weekly off a jet-fuel index, deliberately NOT hardcoded in
code (see `computeShippingByZone`'s `fuelSurchargeRate` param, config key
`DHL_FUEL_SURCHARGE_RATE`). Defaults to 0 until set. Checked `app_secrets` table 2026-08-06: no
DHL/fuel/ship keys present, so it is very likely still unconfigured (may also live as a Deno
function secret I cannot query directly). **Next action: get the current DHL fuel surcharge %
(their website / rate card, weekly) and set it.**

Also worth knowing: `shipping-quote` (the pre-checkout preview) intentionally uses the
itemCount weight estimate, not real Shopify weight, so the preview can differ very slightly from
the real charged total — documented as accepted variance, not a bug.

2026-08-05 also had a same-day revert: `SHIP_COUNTRIES` was briefly expanded from the curated
~38-country list to ~213 countries (commit `db36f97`) without Mike's sign-off, then reverted same
day on his explicit instruction — the commit's own comment had flagged it as needing approval
first. Do not re-expand without his go-ahead.

## Separate thing: MyDHL direct-shipment-creation API (NOT the shipping-cost fix above)
Different DHL product entirely. Context: the third-party Shopify app "DHL Express Commerce"
created one real shipment correctly (order #1001, 2026-07-27) then silently stopped processing
every order since, with zero visible error. Mike's call: stop depending on a third-party app for
this, integrate DHL's own MyDHL API directly (`POST /shipments`, same-call tracking# + label).
Built 2026-08-03 (`supabase/functions/create-dhl-shipment/`, `_shared/dhl-shipment.ts`,
`dhl_shipments` ledger migration), fully tested, **NOT deployed**, gated behind
`DHL_DIRECT_SHIP_ENABLED` (off by default). Full details + activation checklist in
`DHL-SHIPMENT-SETUP.md` in the repo root. Blocker was DHL's approval of API access tied to
Larissa's real DHL Express account number (separate credentials from the tracking API, which
already works — `dhl-track` function has been live a while).

**2026-08-06: Mike says "the DHL key is approved today."** Not yet confirmed which product this
is — almost certainly the MyDHL Shipping API (the tracking API was already active), since DHL's
own SLA is "next business day" and the access request was submitted within this window. NEXT: get
the real API key + secret + DHL account number from Larissa as Supabase secrets (never in chat),
then follow `DHL-SHIPMENT-SETUP.md`'s activation checklist — test sandbox call first, confirm a
real label comes back, only then flip `DHL_DIRECT_SHIP_ENABLED` against test, then swap to
production credentials on Mike's explicit go.

## House lesson from this session
The Claude persistent-memory index can go stale relative to a fast-moving home session (a week of
auto-committed work happened with zero memory narration). When Mike asks "is everything synced" or
similar, don't answer from memory alone — check git log/status against origin AND live deployed
state (Supabase `list_edge_functions` timestamps, `app_secrets`) directly, they are ground truth.
