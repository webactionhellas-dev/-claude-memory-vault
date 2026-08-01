import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin, adminReady } from '@/lib/supabase-admin';
import { invalidateCatalog } from '@/lib/catalog';
import { ADMIN_EDITABLE } from '@/lib/store-config';

export const prerender = false;

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 80);

const num = (v: any) => (v === '' || v == null ? null : Number(v));

/** Map the camelCase form payload onto the snake_case products row. */
function toRow(b: any) {
  return {
    name: String(b.name ?? '').trim(),
    brand: String(b.brand ?? '').trim(),
    price: Number(b.price) || 0,
    compare_at_price: num(b.compareAtPrice),
    category: String(b.category ?? 'products'),
    categories: Array.isArray(b.categories) ? b.categories : [],
    colors: Array.isArray(b.colors) ? b.colors : [],
    sizes: Array.isArray(b.sizes) ? b.sizes : [],
    description: String(b.description ?? ''),
    materials: String(b.materials ?? ''),
    badge: b.badge ? String(b.badge) : null,
    rating: num(b.rating),
    reviews: Number(b.reviews) || 0,
    in_stock: b.inStock !== false,
    release_date: b.releaseDate || null,
    featured: !!b.featured,
    trending: !!b.trending,
    images: Array.isArray(b.images) ? b.images.filter(Boolean) : [],
  };
}

/** Replace the per-size stock rows for a product. */
async function setStock(slug: string, stock: any) {
  if (!stock || typeof stock !== 'object') return;
  await supabaseAdmin.from('inventory').delete().eq('product_slug', slug);
  const rows = Object.entries(stock)
    .filter(([, q]) => q !== '' && q != null)
    .map(([size, q]) => ({ product_slug: slug, size, quantity: Math.max(0, Number(q) || 0) }));
  if (rows.length) await supabaseAdmin.from('inventory').insert(rows);
}

async function guard(cookies: any, request: Request) {
  const g = await requireAdmin(cookies, request);
  if (!g.ok) return json({ error: g.error }, g.status);
  if (!adminReady()) return json({ error: 'Server not configured.' }, 503);
  // Product writes are enabled once the admin is self-service (ADMIN_EDITABLE).
  if (!ADMIN_EDITABLE) return json({ error: 'Product editing is disabled for this store.' }, 409);
  return null;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const bad = await guard(cookies, request);
  if (bad) return bad;
  const b = await request.json().catch(() => ({}));
  if (!b.name || !b.brand) return json({ error: 'Name and brand are required.' }, 400);

  // unique slug
  let base = (b.slug && slugify(b.slug)) || slugify(b.name) || 'product';
  let slug = base;
  for (let n = 2; ; n++) {
    const { data } = await supabaseAdmin.from('products').select('slug').eq('slug', slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${n}`;
  }
  const { data: mx } = await supabaseAdmin
    .from('products').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const sort_order = (mx?.sort_order ?? 0) + 1;

  // New products automatically join "New Arrivals": ensure the category tag is
  // present and stamp an arrival date (today) when none was given, so they show
  // on the homepage rail (sorted newest-first) and under /shop?category=new-arrivals.
  const row = toRow(b);
  if (!row.categories.includes('new-arrivals')) row.categories = [...row.categories, 'new-arrivals'];
  if (!row.release_date) row.release_date = new Date().toISOString().slice(0, 10);

  const { error } = await supabaseAdmin.from('products').insert({ slug, ...row, sort_order });
  if (error) return json({ error: error.message }, 500);
  await setStock(slug, b.stock);
  invalidateCatalog();
  return json({ ok: true, slug });
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const bad = await guard(cookies, request);
  if (bad) return bad;
  const b = await request.json().catch(() => ({}));
  const slug = String(b.slug || '');
  if (!slug) return json({ error: 'Missing slug.' }, 400);
  const { error } = await supabaseAdmin.from('products').update(toRow(b)).eq('slug', slug);
  if (error) return json({ error: error.message }, 500);
  if ('stock' in b) await setStock(slug, b.stock);
  invalidateCatalog();
  return json({ ok: true, slug });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const bad = await guard(cookies, request);
  if (bad) return bad;
  const b = await request.json().catch(() => ({}));
  const slug = String(b.slug || '');
  if (!slug) return json({ error: 'Missing slug.' }, 400);
  await supabaseAdmin.from('inventory').delete().eq('product_slug', slug);
  const { error } = await supabaseAdmin.from('products').delete().eq('slug', slug);
  if (error) return json({ error: error.message }, 500);
  invalidateCatalog();
  return json({ ok: true });
};
