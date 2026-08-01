// Stage 1: pull raw Shopify feeds from drip.store and save to scraper/raw/
import { writeFile, mkdir } from 'node:fs/promises';

const BASE = 'https://drip.store';
const OUT = new URL('./raw/', import.meta.url);

async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
          'accept-language': 'el-GR,el;q=0.9,en;q=0.8',
        },
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise(res => setTimeout(res, 800 * (i + 1)));
    }
  }
}

async function allProducts() {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const j = await getJSON(`${BASE}/products.json?limit=250&page=${page}`);
    const prods = j.products || [];
    if (!prods.length) break;
    out.push(...prods);
    process.stdout.write(`  products page ${page}: +${prods.length} (total ${out.length})\n`);
    if (prods.length < 250) break;
  }
  return out;
}

async function allCollections() {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const j = await getJSON(`${BASE}/collections.json?limit=250&page=${page}`);
    const cols = j.collections || [];
    if (!cols.length) break;
    out.push(...cols);
    if (cols.length < 250) break;
  }
  return out;
}

await mkdir(OUT, { recursive: true });
console.log('Fetching products...');
const products = await allProducts();
console.log('Fetching collections...');
const collections = await allCollections();

await writeFile(new URL('products.json', OUT), JSON.stringify(products));
await writeFile(new URL('collections.json', OUT), JSON.stringify(collections));

console.log(`\nSaved ${products.length} products, ${collections.length} collections.`);

// Inspect one rich product
const sample = products.find(p => (p.images || []).length > 1) || products[0];
console.log('\n=== SAMPLE PRODUCT ===');
console.log('title   :', sample.title);
console.log('vendor  :', sample.vendor);
console.log('type    :', sample.product_type);
console.log('tags    :', (sample.tags || []).join(', '));
console.log('options :', JSON.stringify(sample.options));
console.log('#images :', (sample.images || []).length);
console.log('img[0]  :', sample.images?.[0]?.src);
console.log('variant0:', JSON.stringify(sample.variants?.[0]));

// Aggregate stats
const vendors = {}, types = {}, tagcount = {};
let withImg = 0, totalImgs = 0;
for (const p of products) {
  vendors[p.vendor] = (vendors[p.vendor] || 0) + 1;
  types[p.product_type] = (types[p.product_type] || 0) + 1;
  if ((p.images || []).length) withImg++;
  totalImgs += (p.images || []).length;
  for (const t of (p.tags || [])) tagcount[t] = (tagcount[t] || 0) + 1;
}
const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 18);
console.log('\nVENDORS:', JSON.stringify(top(vendors)));
console.log('\nTYPES  :', JSON.stringify(top(types)));
console.log('\nTOPTAGS:', JSON.stringify(top(tagcount)));
console.log(`\nproducts with >=1 image: ${withImg}/${products.length}, total images: ${totalImgs}`);
