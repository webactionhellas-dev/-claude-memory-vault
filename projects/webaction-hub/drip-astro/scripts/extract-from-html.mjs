/**
 * One-time migration: pull the product catalog + all photos out of the legacy
 * single-file HTML build and into a maintainable Astro structure.
 *
 *   node scripts/extract-from-html.mjs
 *
 * Output:
 *   src/data/products.json          (311 products, images referenced by filename)
 *   src/data/meta.json              (brand + category facets)
 *   src/assets/products/*.{jpg,png,webp}   (973 real image files, no base64)
 *   public/logo.svg is kept separately; the raster logo goes to src/assets/brand/
 *
 * After this runs, products.json is the single source of truth — edit it directly
 * to add/remove products; you never need to touch this script again.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_HTML = 'C:/Users/nospa/Downloads/drip-store-eshop (1).html';

const IMG_DIR = path.join(ROOT, 'src/assets/products');
const BRAND_DIR = path.join(ROOT, 'src/assets/brand');
const DATA_DIR = path.join(ROOT, 'src/data');
for (const d of [IMG_DIR, BRAND_DIR, DATA_DIR]) fs.mkdirSync(d, { recursive: true });

const html = fs.readFileSync(SRC_HTML, 'utf8');

function extractConst(name) {
  const marker = `const ${name} = `;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`${name} not found`);
  const from = start + marker.length;
  const end = html.indexOf('\nconst ', from);
  let chunk = html.slice(from, end < 0 ? undefined : end).trim();
  if (chunk.endsWith(';')) chunk = chunk.slice(0, -1);
  return JSON.parse(chunk);
}

const extOf = (mime) => ({ jpeg: 'jpg', jpg: 'jpg', png: 'png', webp: 'webp' }[mime] || 'jpg');

function writeDataUri(uri, basename) {
  const m = /^data:image\/([a-zA-Z+]+);base64,(.+)$/s.exec(uri);
  if (!m) return null;
  const ext = extOf(m[1].toLowerCase());
  const file = `${basename}.${ext}`;
  fs.writeFileSync(path.join(IMG_DIR, file), Buffer.from(m[2], 'base64'));
  return file;
}

const DATA = extractConst('DATA');
const META = extractConst('META');
let LOGO = null;
try { LOGO = extractConst('LOGO'); } catch {}

let imgCount = 0;
const products = DATA.map((p) => {
  const images = (p.images || [])
    .map((uri, i) => writeDataUri(uri, `${p.slug}-${i + 1}`))
    .filter(Boolean);
  imgCount += images.length;
  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? null,
    category: p.category,
    categories: p.categories || [],
    colors: p.colors || [],
    sizes: p.sizes || [],
    description: p.description || '',
    materials: p.materials || '',
    badge: p.badge || null,
    rating: p.rating ?? null,
    reviews: p.reviews ?? 0,
    inStock: p.inStock !== false,
    releaseDate: p.releaseDate || null,
    featured: !!p.featured,
    trending: !!p.trending,
    images,
  };
});

if (LOGO) {
  const file = writeDataUri(LOGO, 'logo');
  if (file) fs.renameSync(path.join(IMG_DIR, file), path.join(BRAND_DIR, file));
}

fs.writeFileSync(path.join(DATA_DIR, 'products.json'), JSON.stringify(products, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'meta.json'), JSON.stringify(META, null, 2));

console.log(`Wrote ${products.length} products and ${imgCount} images.`);
console.log(`Brands: ${META.brands.length}, Categories: ${META.categories.length}`);
