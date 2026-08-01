import type { APIRoute } from 'astro';
import { supabaseAdmin, adminReady } from '@/lib/supabase-admin';
import { shopifyStoreUrl } from '@/lib/store-config';

export const prerender = false;

// Headless-Shopify checkout handoff.
// The customer shops on our Astro storefront; when they check out we build a
// Shopify cart permalink (`/cart/<variant_id>:<qty>,…`) from the variant IDs we
// synced into Supabase and redirect there. Payment, orders, inventory, taxes,
// shipping and emails all happen on Shopify exactly as the client works today.
const STORE = shopifyStoreUrl();

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!adminReady()) return json({ error: 'Store is not configured yet.' }, 503);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const lines = Array.isArray(body?.lines) ? body.lines : [];
  if (!lines.length) return json({ error: 'Your bag is empty.' }, 400);

  // Pull the variant maps for just the slugs in the bag.
  const slugs = [...new Set(lines.map((l: any) => String(l.slug)))];
  const { data, error } = await supabaseAdmin.from('products').select('slug, variants').in('slug', slugs);
  if (error) return json({ error: 'Could not reach the catalog.' }, 500);

  const bySlug = new Map<string, any[]>((data ?? []).map((r) => [r.slug, (r.variants as any[]) ?? []]));

  // slug + size  ->  Shopify variant id
  const parts: string[] = [];
  const unavailable: string[] = [];
  for (const l of lines) {
    const variants = bySlug.get(String(l.slug));
    if (!variants?.length) continue;
    const size = String(l.size ?? '');
    const v =
      variants.find((x) => String(x.size) === size) ??
      (variants.length === 1 ? variants[0] : undefined);
    if (!v?.variant_id) { unavailable.push(`${l.slug} ${size}`.trim()); continue; }
    const qty = Math.max(1, Math.min(10, Number(l.qty) || 1));
    parts.push(`${v.variant_id}:${qty}`);
  }

  if (!parts.length) {
    return json({ error: 'These items are no longer available. Please refresh your bag.' }, 409);
  }

  // e.g. https://acme-store.example/cart/52761156321627:1,49271104438619:2
  const url = `${STORE}/cart/${parts.join(',')}`;
  return json({ url, unavailable });
};
