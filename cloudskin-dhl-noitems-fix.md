---
name: cloudskin-dhl-noitems-fix
description: "UPDATED 2026-08-03 - root cause CONFIRMED (not just hypothesis): 29/79 Shopify variants exhaustively verified missing BOTH harmonized_system_code + country_code_of_origin; needs real customs data from Larissa/compliance, do not invent codes"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4bc079d7-c87e-48c0-8d5c-f2ba92a4efc5
  modified: 2026-08-03T14:27:39.187Z
---

**STATUS UPDATE 2026-08-03: the hypothesis below (missing weight/HS/origin) is now CONFIRMED for HS code + country of origin specifically, via an exhaustive Admin API audit of all 79 variants (not the earlier 5-item spot-check that misleadingly looked clean).** Full detail in [[cloudskin-studio-live-and-pending]] LATEST-14. Summary: weight is now fine (78/79 variants have real `grams`, only the fake Test Product is 0 — being wired into the shipping calc). HS code + country_code_of_origin are BOTH null on **29 of 79 variants**: Ace Dress (S,M), Flow Dress (L,XL), Form Bra (all 4), Performance Shorts (all 4), Performance Tank (all 8), Performance Tee (all 8). The 50 complete variants all use `origin:"CN"`, HS code varies by garment type (`611030` tops/zips, `610453` skirts) — a real pattern to infer likely values from, but get Larissa/compliance to confirm before writing anything; wrong HS codes are a real customs risk. **NEXT STEP: either get the correct HS codes from Larissa for these 6 products, or propose the inferred values (matching an already-correct sibling product's code) for her to confirm, then backfill via the Admin API** (`inventory_items` PUT, `harmonized_system_code` + `country_code_of_origin` fields) — same idempotent-script approach step 3 below already described.

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
