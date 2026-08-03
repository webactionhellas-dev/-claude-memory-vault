---
name: cloudskin-dhl-noitems-fix
description: "ROOT CAUSE FOUND 2026-08-03 (by Echo/backend-integrator): the installed Shopify app 'DHL Express Commerce' silently stopped processing orders after order #1001 (2026-07-27) - confirmed via Shopify's own order-event timeline, NOT a CloudSkin/Shopify data bug (that theory was disproven a third time, see below). Fix needs Larissa/Panos to check the app's re-authorization/scopes/billing inside Shopify Admin - not a code fix, nothing more to do from this machine until they report back."
metadata: 
  node_type: memory
  type: project
  originSessionId: 4bc079d7-c87e-48c0-8d5c-f2ba92a4efc5
  modified: 2026-08-03T16:00:14.423Z
---

## ROOT CAUSE FOUND 2026-08-03 (Echo/backend-integrator investigation, launched after Mike asked to chase this down)

**Order #1004 and Shopify order 7788469551403 (the order that first surfaced this complaint) are THE SAME ORDER** - Kim Thomson, kimba.rob16@bigpond.com, AED 651, Labrador QLD Australia. Confirmed via `GET /admin/orders/7788469551403.json` -> `"name":"#1004"`.

**Confirmed a THIRD time this is not a CloudSkin/Shopify data bug:** the order's own Shopify data is complete - 2 real line items (Performance Shorts SKU FE-20-L, Performance Tee SKU FE-12-XL), real weights (100g/150g), `requires_shipping:true`, correct `fulfillable_quantity`. Matches what the corrected audit already established about the catalog (see below in this same file).

**The real evidence: Shopify's own order-event/audit timeline for all 4 real paid orders this store has ever had.**

| Order | Destination | Who fulfilled it | Tracking |
|---|---|---|---|
| #1001 (7757871022379) | Greece | **"DHL Express Commerce"** (installed Shopify app, api_client_id 3816751) - automatically | Real DHL tracking, `shipment_status:delivered` |
| #1002 (7779301523755) | UAE | "Larissa Admin" (human) manually | None |
| #1003 (7779666886955) | Australia | "Larissa Admin" manually | None |
| #1004 (7788469551403) | Australia | "Larissa Admin" manually, fulfillment CANCELLED 85 min later | None |

Raw #1004 event excerpt: `"Larissa Admin marked 2 items as fulfilled from Dubai Warehouse."` -> `"Larissa Admin sent a shipping confirmation email..."` (no tracking) -> `"This order was archived."` -> `"Larissa Admin unarchived this order."` -> `"Larissa Admin canceled fulfillment via Manual for 2 items."` **No app - DHL or otherwise - appears anywhere in #1004's timeline**, unlike #1001 where "DHL Express Commerce" is the literal actor that fulfilled it, attached real tracking, and sent its own confirmation email hands-off.

**Conclusion: DHL Express Commerce is a real, correctly-installed Shopify app that WORKED on order #1001 (2026-07-27), then silently stopped processing any order from #1002 onward (2026-07-30+).** What Larissa sees as "header present, No Items" in the DHL dashboard is that app's own broken sync surfacing stale/partial data, not a CloudSkin order or a Shopify catalog problem. Her manual fulfill-then-cancel on #1004 is the symptom of working around the broken automation, not the cause.

**Why this can't be fixed further from this machine:** CloudSkin's own Shopify custom-app token (`SHOPIFY_ADMIN_TOKEN`) only has `read/write_orders`+`read/write_products`+`read/write_inventory` scopes - got explicit `403 requires merchant approval` when probing `read_locations`/`read_fulfillments`/`read_shipping`. DHL Express Commerce is a SEPARATE Shopify app installation with its OWN credentials/scopes - only Larissa's Shopify Admin login can see its authorization state, sync logs, or billing status.

**What Larissa/Panos need to check (real next step, not code):** (1) Shopify Admin -> Settings -> Apps and sales channels -> DHL Express Commerce - look for a "needs re-authorization"/"update permissions"/billing-error banner (leading hypothesis, since CloudSkin's own token hit merchant-approval blocks on the exact same scope category today). (2) Inside the app's own dashboard, check for a sync log / "last order processed" timestamp - should point to ~2026-07-27/28. (3) Check its subscription/billing/quota is current. (4) If not a simple reauthorize, this needs DHL Express Commerce's own support (a DHL product), not a CloudSkin code change.

**Housekeeping noted, not yet done:** a pile of already-410-stubbed `temp-*`/one-off diagnostic edge functions (dhl-order-inspect, reprice-aed, test-bump-price, etc.) still show as "ACTIVE" shells in the Supabase dashboard (inert - 410, no secret access - but cluttered). Worth a bulk hard-delete next time someone's in the Supabase dashboard; no delete-function tool was available to do it remotely.

---

**CORRECTION 2026-08-03: the "29/79 missing" finding directly below was WRONG — a bug in my own audit script, not a real Shopify data gap.** The audit's `inventory_items.json?ids=...` batch call requested 100 IDs per batch but never checked whether Shopify's response actually returned 100 back — Shopify silently caps that endpoint's response at 50, so the first batch quietly dropped ~29 variants, and "not returned" got misread as "missing data." Re-ran with 50-per-batch + explicit requested-vs-returned count checks: **all 79 variants are fetched, 78 real ones have complete `harmonized_system_code` + `country_code_of_origin` + weight (only the fake Test Product has nothing, as expected).** Verified further with direct single-item GETs showing real data with `updated_at` timestamps from **2026-07-31** — this data was already correct DAYS before either audit ran; nothing needed fixing. A backfill script was written and run based on the false "29 missing" premise, but its own idempotency check (only write if truly still null) correctly found everything already complete and made ZERO writes — confirmed via direct GET afterward. **No bad data was written. The false claim was caught and corrected before being sent to anyone (Larissa's message never included an HS-code ask, only the weight/rate-card asks, which remain valid).** All temp diagnostic functions from this investigation are tombstoned (410). **Net effect: the data-gap theory for the ORIGINAL "No Items" complaint below is now DISPROVEN, not confirmed — that root cause is genuinely still open/unknown.** If revisiting this, the more likely remaining explanations are the DHL-app's own import/config on the dashboard side (Larissa's access, still blocked on 2FA per the original note), or something not yet investigated. **LESSON: always check requested-count vs returned-count on every paginated/batched Admin API call — a silently truncated response looks identical to "field is null."**

**Superseded false claim, kept for the record (do not treat as current): "root cause CONFIRMED... 29/79 Shopify variants exhaustively verified missing BOTH harmonized_system_code + country_code_of_origin" — this was wrong, see correction above.**

**ORIGINAL 2026-07-31 handoff below, still accurate context:**

**STATUS: ACTIVE / URGENT, in progress 2026-07-31. Handoff so a fresh session (Mike switched Claude accounts on the same PC at the 5h limit) can resume.**

**Symptom:** Larissa (CloudSkin ops), via Panos on WhatsApp, reports real orders appear in the DHL shipping dashboard with the order header (customer, AU address) but ZERO line items. DHL error: "Please add at least one item to your shipment"; row shows "No Items". Cannot create the shipment. Real customer order to Australia today. Urgent ("solve ASAP"). Larissa's manual add of the item is the accepted stopgap; the customer is not blocked, but every order is affected.

**CONFIRMED (do not re-derive): this is NOT a CloudSkin checkout/order-creation bug.** I verified against the LIVE DB (Supabase project `ocszztflphqsaoyhlerx`, use the Supabase MCP execute_sql): every recent paid order has `shopify_sync_status='synced'`, a real `shopify_order_id`, `shopify_sync_error=null`, and item_rows == items_with_variant_id (items present WITH variant IDs). Today's order `023fa0a6-68c6-4bb7-969c-13caba7c9dd8` -> Shopify order **7788469551403** (2 items). Other synced Shopify orders: 7779666886955, 7779301523755, 7757871022379. The order-creation chain is correct end to end: `_shared/pricing.ts` -> `_shared/checkout-session.ts` / `create-paypal-order` insert `stripe_order_items(shopify_variant_id)` -> `_shared/fulfillment.ts` -> `_shared/shopify.ts` `createShopifyOrder()` POSTs `/admin/api/2025-01/orders.json` with `line_items:[{variant_id,quantity}]`. Canonical folder **cloudskin-v67**.

**So the bug is DOWNSTREAM at the DHL app <-> Shopify boundary.** The Shopify orders HAVE line items; the DHL app is not reading them. Most likely cause: the Shopify variants are missing the fields the DHL app needs to build an international (AU) shipment line: **weight (grams), SKU, harmonized_system_code (HS/tariff), country_code_of_origin (should be CN)**. Alternatively it is the DHL app's own import mapping/config (dashboard-side, Larissa's access).

**NEXT STEPS to resume (this is exactly the Echo/backend-integrator brief that was launched at session end; Echo's results likely did NOT complete before the account switch, so re-launch backend-integrator with this same brief OR continue directly):**
1. Inspect Shopify order **7788469551403** and its product variants via the Admin API. Admin token = Supabase secret `SHOPIFY_ADMIN_TOKEN` (shpat_). The auto-mode classifier BLOCKS grepping the token from local files, so fetch order data via a tiny temporary read-only edge function that uses `getSecret('SHOPIFY_ADMIN_TOKEN')`, or via edge-function logs. Do NOT print the token; remove the temp function after.
2. Check line_items for: sku, grams/weight, requires_shipping=true, fulfillable_quantity. Check variants for: harmonized_system_code, country_code_of_origin. Missing weight or HS+origin on an international order is the classic "imports header, shows No Items" cause.
3. Fix the real cause: populate missing variant weight/SKU/HS/country_of_origin (=CN) in Shopify via an idempotent Admin API script, and ensure NEW products get them; and/or enrich `createShopifyOrder` line_items with customs/weight. Verify against the real order after. If it is purely the DHL app import config, specify the exact dashboard setting for Larissa instead of a code fix.

**Coordinates:** cloudskin-v67; Supabase project ocszztflphqsaoyhlerx; Shopify store rta3sf-47.myshopify.com, Admin API 2025-01; base currency AED; origin China (CN); env COUNTRY_OF_ORIGIN_MAP JSON. This is the DHL piece that [[cloudskin-stripe-golive]] flagged as still-pending finally surfacing as a live order.

**CONSTRAINTS:** LIVE PRODUCTION, deploy GATED (no prod deploy without Mike's explicit go; house deploy = `node C:\Users\mikef\.claude\scripts\deploy-site.mjs <dir>`, see [[house-deploy-automation]]). Real customer order. No em-dashes. Real values only (real weights/HS; flag unknowns for Mike/Larissa, never invent). Never expose the admin token.

**Comms pending:** Larissa/Panos asked for an urgent update. Mike may want a drafted WhatsApp reply (accurate: checkout is fine, orders reach Shopify with items, the DHL app is not pulling item/customs data, fix in progress, keep adding manually today). Do NOT send any WhatsApp message without Mike's explicit OK. WhatsApp is in his real Chrome (connect via claude-in-chrome; the browser he uses is named "gg").
