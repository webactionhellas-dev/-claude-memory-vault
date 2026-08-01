import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { getSecret, getConfig, serviceClient } from '../_shared/env.ts';

// ============================================================================
// CLOUDSKIN, backfill-variant-customs  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// STAGED, NOT DEPLOYED. Deploy only on Mike's explicit go.
//
// CONTEXT: This is NOT the fix for the DHL "No Items" bug (that was an ops
// workflow issue: orders were being manually marked "fulfilled" in Shopify
// BEFORE the DHL Express Commerce app created the shipment, leaving zero
// fulfillable line items for the app to ship). See the investigation handover.
//
// This function addresses a SEPARATE, real gap found during that investigation:
// the Shopify inventory items carry NO customs data, which DHL Express needs
// for international commercial invoices once the workflow is corrected:
//   inventory_item.country_code_of_origin = null   (should be CN)
//   inventory_item.harmonized_system_code  = null   (HS/tariff code, per product)
//
// WHAT IT DOES (idempotent, dry-run by default):
//   - Walks every product/variant in the store.
//   - For each variant's inventory item, sets:
//       country_code_of_origin  <- COUNTRY_OF_ORIGIN_MAP[handle] or DEFAULT (CN)
//       harmonized_system_code  <- HS_CODE_MAP[handle]  (ONLY if provided)
//   - Writes ONLY when the current value is missing or differs (idempotent).
//   - Dry-run unless ?apply=1 is passed, so you preview the exact diff first.
//   - NEVER invents an HS code: if a handle has no real code in HS_CODE_MAP it is
//     left null and reported under `needsHsCode`, for Mike/Larissa to supply.
//
// SECRETS / CONFIG (Deno.env first, then app_secrets, house pattern):
//   SHOPIFY_ADMIN_TOKEN        (required, shpat_ Admin API token)
//   SHOPIFY_STORE_DOMAIN       (default rta3sf-47.myshopify.com)
//   SHOPIFY_API_VERSION        (default 2025-01)
//   COUNTRY_OF_ORIGIN_MAP      (existing JSON { "handle": "CN" })
//   DEFAULT_COUNTRY_OF_ORIGIN  (default "CN" — all CloudSkin products are China)
//   HS_CODE_MAP                (JSON { "handle": "61034300" }; REAL codes only)
//   BACKFILL_GUARD             (required shared token; call with ?key=<token>)
//
// USAGE (after deploy, on Mike's go):
//   Preview:  POST .../backfill-variant-customs?key=<guard>
//   Apply:    POST .../backfill-variant-customs?key=<guard>&apply=1
// ============================================================================

const STORE_DOMAIN = getConfig('SHOPIFY_STORE_DOMAIN', 'rta3sf-47.myshopify.com');
const API_VERSION = getConfig('SHOPIFY_API_VERSION', '2025-01');
const DEFAULT_COO = getConfig('DEFAULT_COUNTRY_OF_ORIGIN', 'CN');

const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o, null, 2), { status: s, headers: { 'Content-Type': 'application/json' } });

function jsonMap(key: string): Record<string, string> {
  try { return JSON.parse(getConfig(key, '{}')); } catch { return {}; }
}

async function sFetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/${path}`, {
    ...init,
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json', 'Accept': 'application/json', ...(init?.headers || {}) },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = String(text).slice(0, 400); }
  return { status: res.status, ok: res.ok, body };
}

// Cursor-paginate products via the Link header (Shopify 2019-07+ standard).
async function* allProducts(token: string) {
  let path = `products.json?limit=250&fields=id,handle,title,variants`;
  for (let guard = 0; guard < 50; guard++) {
    const res = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/${path}`, {
      headers: { 'X-Shopify-Access-Token': token, 'Accept': 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    for (const p of data?.products ?? []) yield p;
    const link = res.headers.get('link') || res.headers.get('Link') || '';
    const m = link.match(/<[^>]*[?&]([^>]*page_info=[^>&]+)[^>]*>;\s*rel="next"/);
    if (!m) break;
    path = `products.json?${m[1]}`;
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const guard = getConfig('BACKFILL_GUARD', '');
  if (!guard || url.searchParams.get('key') !== guard) return json({ error: 'forbidden' }, 403);

  const apply = url.searchParams.get('apply') === '1';
  const token = await getSecret('SHOPIFY_ADMIN_TOKEN');
  if (!token) return json({ error: 'SHOPIFY_ADMIN_TOKEN not configured' }, 500);

  const cooMap = jsonMap('COUNTRY_OF_ORIGIN_MAP');
  const hsMap = jsonMap('HS_CODE_MAP');

  const planned: any[] = [];
  const skipped: any[] = [];
  const needsHsCode = new Set<string>();
  const applied: any[] = [];
  const errors: any[] = [];

  for await (const product of allProducts(token)) {
    const handle = String(product.handle || '');
    const wantCoo = cooMap[handle] || DEFAULT_COO || '';
    const wantHs = hsMap[handle] || '';
    if (!wantHs) needsHsCode.add(handle);

    for (const v of product.variants ?? []) {
      const invId = v.inventory_item_id;
      if (!invId) continue;
      const cur = await sFetch(token, `inventory_items/${invId}.json`);
      const it = cur.body?.inventory_item;
      if (!it) { errors.push({ handle, variant: v.id, step: 'read', status: cur.status }); continue; }

      const patch: Record<string, string> = {};
      if (wantCoo && it.country_code_of_origin !== wantCoo) patch.country_code_of_origin = wantCoo;
      if (wantHs && it.harmonized_system_code !== wantHs) patch.harmonized_system_code = wantHs;

      if (Object.keys(patch).length === 0) {
        skipped.push({ handle, sku: it.sku, reason: 'already correct or nothing to set' });
        continue;
      }
      const change = { handle, sku: it.sku, inventory_item_id: invId, from: { country_code_of_origin: it.country_code_of_origin, harmonized_system_code: it.harmonized_system_code }, to: patch };
      planned.push(change);

      if (apply) {
        const put = await sFetch(token, `inventory_items/${invId}.json`, { method: 'PUT', body: JSON.stringify({ inventory_item: { id: invId, ...patch } }) });
        if (put.ok) applied.push({ handle, sku: it.sku, set: patch });
        else errors.push({ handle, sku: it.sku, step: 'write', status: put.status, body: put.body });
      }
    }
  }

  return json({
    mode: apply ? 'APPLIED' : 'DRY-RUN (pass ?apply=1 to write)',
    defaultCountryOfOrigin: DEFAULT_COO,
    plannedCount: planned.length,
    appliedCount: applied.length,
    skippedCount: skipped.length,
    errorCount: errors.length,
    needsHsCode: [...needsHsCode].sort(),
    planned,
    applied,
    errors,
  });
});
