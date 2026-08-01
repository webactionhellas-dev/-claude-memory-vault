import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const DOM = 'rta3sf-47.myshopify.com';
const API = '2025-01';
// Absolute AED prices = round(EUR * 4.2). Idempotent.
const AED: Record<string, string> = {
  'the-signature-bra': '353', 'the-signature-skirtt': '370', 'the-sculpt-bra': '315',
  'the-court-skirt': '328', 'the-foundation-tank': '311', 'the-club-skirt': '286',
  'the-club-quarter-zip': '286', 'the-elevate-cropped-jacket': '454',
  'the-elevate-cropped-jacket-copy': '412', 'the-flow-dress': '496',
  'the-performance-tee': '269', 'the-performance-tank': '286', 'the-form-bra': '286',
  'the-ace-dress': '538', 'the-performance-shorts': '311'
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const dry = url.searchParams.get('go') !== 'REPRICE_AED';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: row } = await sb.from('app_secrets').select('value').eq('key','SHOPIFY_ADMIN_TOKEN').maybeSingle();
  const token = row?.value || '';
  if (!token) return new Response('No admin token', { status: 500 });
  const H = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };
  const pr = await fetch(`https://${DOM}/admin/api/${API}/products.json?limit=250&fields=id,handle,variants`, { headers: H });
  if (!pr.ok) return new Response('products fetch failed: ' + pr.status, { status: 502 });
  const products = (await pr.json()).products || [];
  const results: any[] = [];
  for (const p of products) {
    const target = AED[p.handle];
    if (!target) { results.push({ handle: p.handle, skipped: true }); continue; }
    for (const v of (p.variants || [])) {
      if (dry) { results.push({ handle: p.handle, before: v.price, wouldSet: target, dry: true }); continue; }
      const ur = await fetch(`https://${DOM}/admin/api/${API}/variants/${v.id}.json`, { method: 'PUT', headers: H, body: JSON.stringify({ variant: { id: v.id, price: target } }) });
      results.push({ handle: p.handle, before: v.price, after: target, ok: ur.ok, status: ur.status });
    }
  }
  const priced = results.filter(r => !r.skipped);
  return new Response(JSON.stringify({ dry, variants: priced.length, updated: priced.filter(r=>r.ok).length, failed: priced.filter(r=>r.ok===false).length, byHandle: Object.fromEntries(products.filter((p:any)=>AED[p.handle]).map((p:any)=>[p.handle, {before: p.variants?.[0]?.price, target: AED[p.handle]}])) }, null, 2), { headers: { 'Content-Type': 'application/json' } });
});
