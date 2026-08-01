import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin, adminReady } from '@/lib/supabase-admin';
import { SHOPIFY_MANAGED, shopifyStoreUrl } from '@/lib/store-config';
import { invalidateCatalog } from '@/lib/catalog';
// @ts-ignore - plain JS module shared with the Node CLI (no types)
import { syncShopifyCatalog } from '@/lib/shopify-sync.mjs';

export const prerender = false;

// Admin-triggered "Sync from Shopify now" (the button on /admin/products).
// Same engine as the nightly cron, but gated by the admin session instead of
// the CRON_SECRET so it's safe to call from the browser.
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, cookies }) => {
  const g = await requireAdmin(cookies, request);
  if (!g.ok) return json({ error: g.error }, g.status);
  if (!adminReady()) return json({ error: 'Server not configured.' }, 503);
  if (!SHOPIFY_MANAGED) return json({ error: 'This store is not Shopify-managed.' }, 400);

  const started = Date.now();
  try {
    const s = await syncShopifyCatalog(supabaseAdmin, { storeUrl: shopifyStoreUrl(), write: true, maxSamples: 120 });
    invalidateCatalog(); // storefront reflects the new catalogue on the next request
    return json({ ok: true, ms: Date.now() - started, total: s.total, inserted: s.inserted, updated: s.updated, removed: s.removed });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? String(e) }, 500);
  }
};
