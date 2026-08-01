/* ============================================================
   CloudSkin, sync live Shopify prices INTO js/products.js
   ------------------------------------------------------------
   WHY THIS EXISTS: the storefront display price comes from the static
   js/products.js catalog, NOT a live Shopify fetch (only the CHECKOUT
   re-prices live, via supabase/functions/_shared/shopify.ts). Editing
   a price in Shopify Admin therefore does nothing to what customers SEE
   on the product page - it only affects what they'd actually be charged.
   This script closes that gap: it re-fetches every product's current
   price (+ compareAt) from Shopify's public Storefront API (the SAME
   token already embedded client-side, safe to use here) and writes it
   into js/products.js, touching ONLY the "price"/"compareAt" fields -
   every other hand-authored field (images, blurb, badges, sizes, etc.)
   is left byte-identical, same regex-edit approach as
   apply-aed-rebase.mjs.

   Usage:
     node scripts/sync-prices-from-shopify.mjs --check   (report only)
     node scripts/sync-prices-from-shopify.mjs           (apply)
   Then:  node scripts/deploy.mjs                         (ship it)
   ============================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const STORE_DOMAIN = 'rta3sf-47.myshopify.com';
const STOREFRONT_TOKEN = '54674b6ccdc6cdd3817ee38afd8db4aa'; // public, same as _shared/shopify.ts
const API_VERSION = '2025-01';

async function fetchAllProducts() {
  const query = `query($cursor:String){ products(first:50, after:$cursor){
    pageInfo{ hasNextPage endCursor }
    nodes{ handle
      variants(first:1){ nodes{ price{ amount currencyCode } compareAtPrice{ amount } } }
    }
  } }`;
  let cursor = null, all = [];
  for (;;) {
    const res = await fetch(`https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN },
      body: JSON.stringify({ query, variables: { cursor } }),
    });
    if (!res.ok) throw new Error(`Storefront API HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(`Storefront API: ${JSON.stringify(json.errors)}`);
    const page = json.data.products;
    all = all.concat(page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }
  return all;
}

const products = await fetchAllProducts();
const byHandle = new Map();
for (const p of products) {
  const v = p.variants.nodes[0];
  if (!v) continue;
  byHandle.set(p.handle, {
    price: Math.round(parseFloat(v.price.amount)),
    compareAt: v.compareAtPrice ? Math.round(parseFloat(v.compareAtPrice.amount)) : null,
  });
}

const path = join(ROOT, 'js/products.js');
let src = readFileSync(path, 'utf8');
let applied = 0, already = 0;
const missing = [];
const report = [];

for (const [handle, live] of byHandle) {
  const re = new RegExp(`("handle":\\s*"${handle}"[\\s\\S]{0,900}?"price":\\s*)([0-9.]+)([\\s\\S]{0,200}?"compareAt":\\s*)(null|[0-9.]+)`);
  const m = src.match(re);
  if (!m) { missing.push(handle); continue; }
  const curPrice = Number(m[2]);
  const curCompareRaw = m[4];
  const curCompare = curCompareRaw === 'null' ? null : Number(curCompareRaw);
  if (curPrice === live.price && curCompare === live.compareAt) { already++; continue; }
  const newCompare = live.compareAt === null ? 'null' : String(live.compareAt);
  src = src.replace(re, `$1${live.price}$3${newCompare}`);
  applied++;
  report.push(`  ${handle.padEnd(36)} price ${curPrice} -> ${live.price}` +
    (curCompare !== live.compareAt ? `   compareAt ${curCompare} -> ${newCompare}` : ''));
}

console.log(`Shopify products fetched: ${byHandle.size}`);
console.log(`Matched in products.js:   ${byHandle.size - missing.length}`);
if (missing.length) console.log(`Not found in products.js (handle mismatch, skipped): ${missing.join(', ')}`);
console.log(`Already in sync: ${already}`);
console.log(`${CHECK ? 'Would update' : 'Updated'}: ${applied}`);
if (report.length) console.log(report.join('\n'));

if (!CHECK && applied > 0) {
  writeFileSync(path, src);
  console.log('\njs/products.js written. Run: node scripts/deploy.mjs');
} else if (!CHECK) {
  console.log('\nNo changes needed - products.js already matches live Shopify prices.');
}
