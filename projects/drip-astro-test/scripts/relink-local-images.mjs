// GATED one-off — severs the last live Shopify dependency (product imagery).
//
// The live `products` table currently stores Shopify CDN image URLs
// (https://cdn.shopify.com/...), left behind by a past `sync-shopify` run. At
// runtime loadCatalog() serves the DB, so the storefront pulls product photos
// from Shopify's CDN — they break the day the client closes Shopify. The repo
// already ships the optimized local WebP set (src/assets/products/*, referenced
// by src/data/products.json), and resolveImage() maps those bare filenames into
// Astro's image pipeline. This script rewrites products.images per-slug from
// products.json so every photo resolves to a bundled local asset and no request
// ever leaves for cdn.shopify.com.
//
// Safe + idempotent: only the `images` column is touched, only for slugs present
// in products.json (prices, stock, admin edits are untouched). Re-running is a
// no-op once done.
//
//   RUN (only on Mike's go):  node --env-file=.env scripts/relink-local-images.mjs
//   DRY RUN (no writes):      node --env-file=.env scripts/relink-local-images.mjs --dry
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

const SUPA_URL = process.env.PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SECRET) { console.error('Missing PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const DRY = process.argv.includes('--dry');

const sb = createClient(SUPA_URL, SECRET, { auth: { persistSession: false } });
const catalog = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));

// Which live rows still point at a remote (Shopify) image?
const { data: rows, error } = await sb.from('products').select('slug, images');
if (error) { console.error(error.message); process.exit(1); }
const isRemote = (u) => typeof u === 'string' && /^https?:\/\//.test(u);
const bySlug = new Map(catalog.map((p) => [p.slug, p.images ?? []]));

let updated = 0, skipped = 0, unmapped = 0;
for (const row of rows) {
  const needsFix = (row.images ?? []).some(isRemote);
  if (!needsFix) { skipped++; continue; }
  const local = bySlug.get(row.slug);
  if (!local || !local.length) { unmapped++; console.warn('  no local images for', row.slug); continue; }
  if (DRY) { updated++; continue; }
  const { error: e } = await sb.from('products').update({ images: local }).eq('slug', row.slug);
  if (e) { console.error('  failed', row.slug, e.message); continue; }
  updated++;
}
console.log(`${DRY ? '[dry] would update' : 'updated'} ${updated} · already-local ${skipped} · unmapped ${unmapped}`);
console.log(DRY ? 'Dry run only — no writes.' : 'Done. The storefront now serves local images; Shopify CDN is no longer hit.');
