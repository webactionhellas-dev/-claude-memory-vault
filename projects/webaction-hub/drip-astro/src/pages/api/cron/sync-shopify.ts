import type { APIRoute } from 'astro';
import { supabaseAdmin, adminReady } from '@/lib/supabase-admin';
import { shopifyStoreUrl } from '@/lib/store-config';
// @ts-ignore - plain JS module shared with the Node CLI (no types)
import { syncShopifyCatalog } from '@/lib/shopify-sync.mjs';

export const prerender = false;

// Nightly Shopify → Supabase catalog refresh. Wired to Vercel Cron in
// vercel.json (`/api/cron/sync-shopify`). Vercel sends the request with
// `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set — we require it
// so the route can't be triggered by the public.
const CRON_SECRET = import.meta.env.CRON_SECRET || '';

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

async function run(request: Request): Promise<Response> {
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization') || '';
    if (auth !== `Bearer ${CRON_SECRET}`) return json({ error: 'Unauthorized' }, 401);
  }
  if (!adminReady()) return json({ error: 'Store not configured.' }, 503);

  const started = Date.now();
  try {
    const s = await syncShopifyCatalog(supabaseAdmin, { storeUrl: shopifyStoreUrl(), write: true, maxSamples: 120 });
    return json({
      ok: true, ms: Date.now() - started,
      total: s.total, inserted: s.inserted, updated: s.updated, removed: s.removed,
      onSale: s.onSale, soldOut: s.soldOut, changed: s.changes.length,
      inventoryRows: s.inventoryRows ?? null, unmappedVendors: s.unmappedVendors,
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
}

// Vercel Cron uses GET; POST allowed for manual triggers.
export const GET: APIRoute = ({ request }) => run(request);
export const POST: APIRoute = ({ request }) => run(request);
