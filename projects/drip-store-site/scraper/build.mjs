// Data pipeline for the DRIP storefront.
// Usage:
//   node scraper/build.mjs          -> rebuild data/*.json from cached raw feed
//   node scraper/build.mjs --fresh  -> re-scrape drip.store + re-download all images
//
// NOTE: index.html / shop.html / product.html are hand-authored static pages that
// read data/products.json directly — they are NOT generated here, so this script
// never touches them. (The old `inject-*` scripts that patched the original compiled
// template are kept in this folder for reference only; the compiled build is archived
// at ../index.compiled.html and the pristine template at ../index.original.html.)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = new URL('.', import.meta.url);
const run = f => { const r = spawnSync(process.execPath, [fileURLToPath(new URL(f, here))], { stdio: 'inherit' }); if (r.status) process.exit(r.status); };
const fresh = process.argv.includes('--fresh');

if (fresh) run('fetch-raw.mjs');        // pull products + collections from Shopify
run('normalize.mjs');                    // -> data/products.json, data/categories.json
if (fresh) run('download-images.mjs');   // -> assets/images/products/*

console.log('\n✅ Data ready. Open the store with:  python -m http.server 8761  (then /index.html)');
