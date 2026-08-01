// Seeds the Supabase `products` table from the static src/data/products.json.
// Run once after creating the table:  node --env-file=.env scripts/seed-products.mjs
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

const SUPA_URL = process.env.PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SECRET) { console.error('Missing PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const sb = createClient(SUPA_URL, SECRET, { auth: { persistSession: false } });

const raw = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));
const products = Array.isArray(raw) ? raw : (raw.products ?? Object.values(raw)[0]);

const rows = products.map((p, i) => ({
  slug: p.slug,
  name: p.name,
  brand: p.brand,
  price: p.price ?? 0,
  compare_at_price: p.compareAtPrice ?? null,
  category: p.category ?? 'sneakers',
  categories: p.categories ?? [],
  colors: p.colors ?? [],
  sizes: p.sizes ?? [],
  description: p.description ?? '',
  materials: p.materials ?? '',
  badge: p.badge ?? null,
  rating: p.rating ?? null,
  reviews: p.reviews ?? 0,
  in_stock: p.inStock ?? true,
  release_date: p.releaseDate ?? null,
  featured: p.featured ?? false,
  trending: p.trending ?? false,
  images: p.images ?? [],
  sort_order: i,
}));

console.log(`Seeding ${rows.length} products…`);
let done = 0;
for (let i = 0; i < rows.length; i += 100) {
  const batch = rows.slice(i, i + 100);
  const { error } = await sb.from('products').upsert(batch, { onConflict: 'slug' });
  if (error) { console.error('Batch failed at', i, error.message); process.exit(1); }
  done += batch.length;
  console.log(`  upserted ${done}/${rows.length}`);
}

const { count } = await sb.from('products').select('*', { count: 'exact', head: true });
console.log(`Done. products table now has ${count} rows.`);
