// Bundle the whole store into ONE self-contained, offline HTML file.
// Inlines: fonts, CSS, catalogue data, logo, and a lean (760px) first image per product.
import { readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rd = p => readFile(new URL(p, root));
const rdt = p => readFile(new URL(p, root), 'utf8');

const app = await rdt('single/app.html');
const fonts = await rdt('assets/fonts.css');
const sitecss = await rdt('assets/site.css');
const products = JSON.parse(await rdt('data/products.json'));
const cats = JSON.parse(await rdt('data/categories.json'));
const rawProducts = JSON.parse(await rdt('scraper/raw/products.json'));

const mime = ext => ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }[ext] || 'image/jpeg');
const toDataURI = (buf, ext) => `data:${mime(ext)};base64,${buf.toString('base64')}`;

const MAX_IMAGES = 4;   // gallery images inlined per product (their site shows 3-4)
const IMG_WIDTH = 720;  // px width fetched from the Shopify CDN

const srcMap = {};      // handle -> [up to MAX_IMAGES remote srcs]
for (const rp of rawProducts) if ((rp.images || []).length) srcMap[rp.handle] = rp.images.slice(0, MAX_IMAGES).map(im => im.src.split('?')[0]);

async function fetchLean(src) {
  try {
    const r = await fetch(src + '?width=' + IMG_WIDTH, { headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://drip.store/' } });
    if (r.ok) { const ab = await r.arrayBuffer(); if (ab.byteLength > 1024) return toDataURI(Buffer.from(ab), src.split('.').pop().toLowerCase()); }
  } catch {}
  return null;
}
async function localImage(rel) {
  try { const buf = await readFile(new URL(rel, root)); return toDataURI(buf, rel.split('.').pop().toLowerCase()); } catch { return null; }
}
// disk cache of inlined base64 images (slug -> [dataURI]) so CSS-only rebuilds are instant.
// pass --fresh to ignore it and re-fetch every image from the CDN.
const FRESH = process.argv.includes('--fresh');
const cacheURL = new URL('scraper/.imgcache.json', root);
let imgCache = {};
if (!FRESH) { try { imgCache = JSON.parse(await rdt('scraper/.imgcache.json')); console.log(`Reusing image cache (${Object.keys(imgCache).length} products).`); } catch {} }

async function leanImages(p) {
  if (imgCache[p.slug] && imgCache[p.slug].length) return imgCache[p.slug];
  const remote = srcMap[p.slug] || [];
  const local = (p.images || []).slice(0, MAX_IMAGES);
  const n = Math.max(remote.length, local.length);
  const imgs = [];
  for (let k = 0; k < n; k++) {
    let d = remote[k] ? await fetchLean(remote[k]) : null;
    if (!d && local[k]) d = await localImage(local[k]);
    if (d) imgs.push(d);
  }
  imgCache[p.slug] = imgs;
  return imgs;
}

console.log(`Inlining up to ${MAX_IMAGES} images/product for ${products.length} products...`);
const out = new Array(products.length);
let i = 0, done = 0;
async function worker() {
  while (i < products.length) {
    const idx = i++;
    out[idx] = await leanImages(products[idx]);
    if (++done % 40 === 0) process.stdout.write(`  ...${done}\n`);
  }
}
await Promise.all(Array.from({ length: 16 }, worker));
try { await writeFile(cacheURL, JSON.stringify(imgCache)); } catch {}

let missing = 0;
const slim = products.map((p, idx) => {
  const imgs = out[idx] || [];
  if (!imgs.length) missing++;
  return {
    slug: p.slug, name: p.name, brand: p.brand, price: p.price,
    ...(p.compareAtPrice != null ? { compareAtPrice: p.compareAtPrice } : {}),
    category: p.category, categories: p.categories, colors: p.colors, sizes: p.sizes,
    images: imgs, description: p.description, materials: p.materials,
    badge: p.badge, rating: p.rating, reviews: p.reviews, inStock: p.inStock,
    releaseDate: p.releaseDate, featured: !!p.featured, trending: !!p.trending,
  };
}).filter(p => p.images.length);

const META = { brands: cats.brands, categories: cats.categories };

// hero showcase cutouts (base64 webp, transparent)
let showcase = [];
try { showcase = JSON.parse(await rdt('scraper/showcase-b64.json')).map(s => ({ slug: s.slug, img: s.img, name: s.name, brand: s.brand, price: s.price })); }
catch { console.warn('no showcase-b64.json — hero showcase will be empty'); }

const logoBuf = await rd('assets/brand/drip-logo.png');
const logo = toDataURI(logoBuf, 'png');

// harden a JSON string for embedding inside a classic <script> (no </script, no raw LS/PS)
const BS = String.fromCharCode(92), LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const harden = s => s.split('</').join(BS + '/').split(LS).join(BS + 'u2028').split(PS).join(BS + 'u2029');

const html = app
  .replace('/*__FONTS__*/', () => fonts)
  .replace('/*__SITECSS__*/', () => sitecss)
  .replace('/*__DATA__*/[]', () => harden(JSON.stringify(slim)))
  .replace('/*__META__*/{brands:[]}', () => harden(JSON.stringify(META)))
  .replace('/*__SHOWCASE__*/[]', () => harden(JSON.stringify(showcase)))
  .replace('__LOGO__', () => logo);

const outFile = new URL('drip-store-eshop.html', root);
await writeFile(outFile, html);
const dl = 'C:/Users/mikef/Downloads/drip-store-eshop.html';
await copyFile(outFile, dl);

const sz = (await stat(outFile)).size;
console.log(`\n✅ Single-file build: ${(sz / 1048576).toFixed(1)} MB`);
console.log(`   products inlined: ${slim.length}/${products.length} (missing img: ${missing})`);
console.log(`   -> ${fileURLToPath(outFile)}`);
console.log(`   -> ${dl}`);
