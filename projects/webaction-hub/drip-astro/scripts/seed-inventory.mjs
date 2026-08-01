// Seeds the `inventory` table from products.json — one row per (slug, size)
// with realistic stock (a deterministic spread, ~12% sold out so the sold-out
// UI is visible). Re-runnable (upsert). Run after the service-role key is set:
//
//   node --env-file=.env scripts/seed-inventory.mjs
//
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

const SUPA_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SERVICE || SERVICE.startsWith('__SET_ME__')) {
  console.error('Set PUBLIC_SUPABASE_URL and a real SUPABASE_SERVICE_ROLE_KEY in .env first.');
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false } });
const data = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));
const products = Array.isArray(data) ? data : data.products;

// tiny deterministic hash so re-seeding keeps the same stock numbers
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

const rows = [];
for (const p of products) {
  const sizes = p.sizes?.length ? p.sizes : ['OS'];
  for (const size of sizes) {
    const h = hash(p.slug + '|' + size);
    const qty = h % 100 < 12 ? 0 : 1 + (h % 9); // 0 (sold out) or 1–9
    rows.push({ product_slug: p.slug, size, quantity: qty });
  }
}

let done = 0;
for (let i = 0; i < rows.length; i += 500) {
  const batch = rows.slice(i, i + 500);
  const { error } = await supabase.from('inventory').upsert(batch, { onConflict: 'product_slug,size' });
  if (error) { console.error('Batch failed:', error.message); process.exit(1); }
  done += batch.length;
  console.log(`  upserted ${done}/${rows.length}`);
}
console.log(`Done. Seeded ${rows.length} inventory rows across ${products.length} products.`);
