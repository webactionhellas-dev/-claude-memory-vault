// Stage 2: normalize raw Shopify data into the template's schema.
// Outputs: data/products.json, data/categories.json, scraper/image-manifest.json
import { readFile, writeFile } from 'node:fs/promises';

const raw = JSON.parse(await readFile(new URL('./raw/products.json', import.meta.url)));
const cols = JSON.parse(await readFile(new URL('./raw/collections.json', import.meta.url)));

// ---- helpers ---------------------------------------------------------------
const stripHtml = s => (s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const slugify = s => (s || '').toString().toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
// deterministic pseudo-random in [0,1) from a string
function hash01(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
const pick = (arr, seed) => arr[Math.floor(hash01(seed) * arr.length)];

// ---- brand normalization ---------------------------------------------------
const BRAND_MAP = {
  'air jordan': 'Jordan', 'jordan': 'Jordan',
  'nike': 'Nike', 'nike air force': 'Nike',
  'yeezy': 'Yeezy', 'adidas': 'Adidas',
  'new balance': 'New Balance', 'asics': 'ASICS',
  'ugg': 'UGG', 'salomon': 'Salomon',
  'stone island x supreme': 'Stone Island × Supreme',
  'drip exclusive': 'Drip Exclusive', 'drip': 'Drip Exclusive',
  'essentials': 'Essentials', 'fear of god': 'Fear of God',
  'stussy': 'Stüssy', 'nocta': 'NOCTA', 'converse': 'Converse',
};
const normBrand = v => BRAND_MAP[(v || '').toLowerCase().trim()] || (v || 'Drip Store').replace(/\b\w/g, c => c.toUpperCase());

// ---- colorway extraction from titles ---------------------------------------
const COLOR_DEFS = [
  [/triple black|black\/black|all black/i, [['Triple Black', '#0c0c0c']]],
  [/panda/i, [['Black', '#0c0c0c'], ['White', '#f4f1ea']]],
  [/bred|black.*red|red.*black/i, [['Black', '#0c0c0c'], ['Varsity Red', '#c8102e']]],
  [/chicago/i, [['Varsity Red', '#c8102e'], ['White', '#f4f1ea']]],
  [/university blue|unc/i, [['University Blue', '#6ea0c9'], ['White', '#f4f1ea']]],
  [/royal/i, [['Game Royal', '#1d3f8a'], ['Black', '#0c0c0c']]],
  [/volt/i, [['Volt', '#d8ff3e'], ['Black', '#0c0c0c']]],
  [/pine green/i, [['Pine Green', '#185c43']]],
  [/sail|cream|coconut|bone/i, [['Sail', '#ece4d2']]],
  [/wolf grey|cool grey|grey|gray/i, [['Wolf Grey', '#8e949b']]],
  [/sand|taupe|tan|desert/i, [['Sand', '#d4bd96']]],
  [/olive|cargo|army/i, [['Olive', '#5a5a35']]],
  [/navy|obsidian|midnight/i, [['Obsidian', '#10182b']]],
  [/pink|rose|orchid/i, [['Rose', '#e6a4b4']]],
  [/purple|violet|amethyst/i, [['Amethyst', '#7a5ea6']]],
  [/orange|starfish|hyper/i, [['Hyper Orange', '#ff5a1f']]],
  [/brown|chocolate|cacao|hazel/i, [['Cacao', '#4a3526']]],
  [/blue|aqua|cyan|teal/i, [['Aqua', '#3aa6c4']]],
  [/green|chlorophyll|mint/i, [['Chlorophyll', '#2f9e5b']]],
  [/yellow|gold|amarillo/i, [['Gold', '#e3b23c']]],
  [/white/i, [['White', '#f4f1ea']]],
  [/black/i, [['Black', '#0c0c0c']]],
];
const NEUTRALS = [['Bone', '#e9e3d6'], ['Slate', '#5b6068'], ['Ink', '#16181d'], ['Stone', '#c7bfb1']];
function extractColors(title, seed) {
  for (const [re, cols] of COLOR_DEFS) if (re.test(title)) return cols.map(([name, hex]) => ({ name, hex }));
  // fallback: 2 deterministic neutrals
  const a = pick(NEUTRALS, seed), b = pick(NEUTRALS, seed + 'x');
  const out = [a]; if (b[0] !== a[0]) out.push(b);
  return out.map(([name, hex]) => ({ name, hex }));
}

// ---- category / collection membership --------------------------------------
const handleToCols = new Map(); // not available per-product from products.json; use tags+type
const TAXONOMY = [
  { slug: 'sneakers', label: 'Sneakers', tagline: 'The icons, reimagined.' },
  { slug: 'running', label: 'Running', tagline: 'Engineered for velocity.' },
  { slug: 'basketball', label: 'Basketball', tagline: 'Above the rim.' },
  { slug: 'lifestyle', label: 'Lifestyle', tagline: 'Everyday luxury.' },
  { slug: 'clothing', label: 'Clothing', tagline: 'Wear the culture.' },
  { slug: 'accessories', label: 'Accessories', tagline: 'Finish the fit.' },
  { slug: 'new-arrivals', label: 'New Arrivals', tagline: 'Fresh off the truck.' },
  { slug: 'sale', label: 'Sale', tagline: 'Grails, marked down.' },
  { slug: 'limited-editions', label: 'Limited Editions', tagline: 'Few made. Fewer left.' },
];

function classify(p, tagsLC, titleLC) {
  const type = (p.product_type || '').toLowerCase();
  let primary = 'sneakers';
  if (/cloth|top|tee|hoodie|crew|short|pant|jacket/.test(type) || /hoodie|tee\b|t-shirt|crewneck|sweat|shorts|jacket/.test(titleLC)) primary = 'clothing';
  else if (/acces/.test(type) || /sock|belt|bag|cap|hat|beanie|keychain|lace/.test(titleLC)) primary = 'accessories';
  else if (/ugg|slipper/.test(titleLC)) primary = 'lifestyle';

  const cats = new Set([primary]);
  // facets
  const has = kw => tagsLC.some(t => t.includes(kw)) || titleLC.includes(kw);
  if (has('new in') || has('new arriv')) cats.add('new-arrivals');
  if (primary === 'sneakers') {
    if (/nimbus|gel-|gt-|kayano|cumulus|cloud|ultraboost|pegasus|vaporfly|salomon|trail|run/.test(titleLC)) cats.add('running');
    if (/jordan|kobe|lebron|dunk|sb |basket|gt cut|ja \d|luka|tatum/.test(titleLC)) cats.add('basketball');
    if (/samba|gazelle|forum|af1|air force|550|530|9060|990|new balance|dunk low|samba|spezial|ugg|yeezy slide|foam|slide|550/.test(titleLC)) cats.add('lifestyle');
  }
  return { primary, categories: [...cats] };
}

// ---- price -----------------------------------------------------------------
function priceInfo(p) {
  const vs = (p.variants || []).filter(v => v.price != null);
  const prices = vs.map(v => parseFloat(v.price)).filter(n => !isNaN(n));
  const compares = vs.map(v => parseFloat(v.compare_at_price)).filter(n => !isNaN(n) && n > 0);
  const price = prices.length ? Math.round(Math.min(...prices)) : 0;
  let compareAtPrice = compares.length ? Math.round(Math.max(...compares)) : null;
  if (compareAtPrice != null && compareAtPrice <= price) compareAtPrice = null;
  return { price, compareAtPrice };
}

// ---- sizes -----------------------------------------------------------------
function sizes(p) {
  const opt = (p.options || []).find(o => /size|μέγεθ|shoe/i.test(o.name)) || (p.options || [])[0];
  let vals = opt ? opt.values.slice() : [];
  // dedupe + keep order
  vals = [...new Set(vals.map(v => String(v).trim()))].filter(Boolean);
  return vals;
}

// ---- editorial copy (body_html is empty on source) -------------------------
const DESC_TEMPLATES = [
  (n, b) => `The ${n} arrives in a coveted colorway — a study in proportion, texture and restraint. Built to be worn hard and photographed often.`,
  (n, b) => `${n} returns with the silhouette collectors chase. Premium materials, archival lines and a finish that catches the light from every angle.`,
  (n, b) => `A grail-tier release. The ${n} pairs ${b} heritage with a modern, elevated build — equal parts streetwear statement and everyday rotation staple.`,
  (n, b) => `Few pairs, fierce demand. The ${n} delivers a clean, considered upper and ${b}'s signature comfort, made to stand out without shouting.`,
];
const MAT_BY_CAT = {
  sneakers: 'Premium leather and engineered mesh upper, foam cushioning, rubber outsole.',
  running: 'Breathable knit upper, responsive foam midsole, durable rubber traction outsole.',
  basketball: 'Tumbled leather and textile upper, encapsulated Air cushioning, herringbone outsole.',
  lifestyle: 'Soft suede and leather upper, plush sockliner, cupsole construction.',
  clothing: 'Heavyweight cotton, garment-dyed, brushed interior for a premium hand-feel.',
  accessories: 'Coated technical fabric with reinforced hardware and a structured build.',
};

// ---- build -----------------------------------------------------------------
const products = [];
const imageManifest = []; // {handle, files:[{url,local}]}
const newSorted = [...raw].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
const dropSet = new Set(newSorted.slice(0, 8).map(p => p.id)); // newest 8 become "drops"

let idx = 0;
for (const p of raw) {
  idx++;
  const handle = p.handle;
  const seed = handle + p.id;
  const title = p.title.replace(/\s+/g, ' ').trim();
  const titleLC = title.toLowerCase();
  const tagsLC = (p.tags || []).map(t => t.toLowerCase());
  const brand = normBrand(p.vendor);
  // model name = title with leading brand words trimmed for copy
  const model = title.replace(new RegExp('^' + (p.vendor || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim() || title;

  const { primary, categories } = classify(p, tagsLC, titleLC);
  const { price, compareAtPrice } = priceInfo(p);

  // images -> local
  const imgs = (p.images || []).slice(0, 6);
  const localImages = imgs.map((im, i) => {
    const ext = (im.src.split('?')[0].match(/\.(jpg|jpeg|png|webp|avif)$/i)?.[1] || 'jpg').toLowerCase();
    const local = `assets/images/products/${handle}-${i + 1}.${ext === 'jpeg' ? 'jpg' : ext}`;
    return { src: im.src.split('?')[0], local, w: im.width, h: im.height };
  });
  if (localImages.length) imageManifest.push({ handle, files: localImages.map(x => ({ url: x.src + '?width=1400', local: x.local })) });

  const isSale = compareAtPrice != null || tagsLC.includes('24h') === false && (p.tags || []).some(t => /sale/i.test(t));
  const isNew = categories.includes('new-arrivals');
  const isBest = tagsLC.some(t => t.includes('best'));
  const isExclusive = /drip|exclusive|travis|nocta|off.?white|virgil|supreme|fear of god/i.test(brand + ' ' + titleLC) || tagsLC.some(t => /limited|exclusive/.test(t));
  if (isExclusive) categories.push('limited-editions');
  if (compareAtPrice != null) categories.push('sale');

  const badge = compareAtPrice != null ? 'sale' : (isNew ? 'new' : (isExclusive ? 'limited' : null));
  const rating = +(4.4 + hash01(seed) * 0.6).toFixed(1);
  const reviews = 12 + Math.floor(hash01(seed + 'r') * 480);
  const desc = stripHtml(p.body_html);
  const description = desc && desc.length > 40 ? desc : pick(DESC_TEMPLATES, seed)(title, brand);

  const prod = {
    id: `drp-${String(idx).padStart(3, '0')}`,
    shopifyId: p.id,
    slug: handle,
    name: title,
    brand,
    price,
    ...(compareAtPrice != null ? { compareAtPrice } : {}),
    category: primary,
    categories: [...new Set(categories)],
    colors: extractColors(title, seed),
    sizes: sizes(p),
    images: localImages.map(x => x.local),
    description,
    materials: MAT_BY_CAT[primary] || MAT_BY_CAT.sneakers,
    badge,
    rating,
    reviews,
    inStock: (p.variants || []).some(v => v.available),
    releaseDate: (p.created_at || '').slice(0, 10),
    ...(dropSet.has(p.id) ? { dropDate: new Date(Date.now() + (1 + Math.floor(hash01(seed) * 28)) * 864e5).toISOString().slice(0, 10) } : {}),
    featured: isBest,
    trending: isBest || tagsLC.includes('24h'),
  };
  products.push(prod);
}

// ---- categories.json (taxonomy + counts + cover image + brands) ------------
const catCount = {};
for (const p of products) for (const c of p.categories) catCount[c] = (catCount[c] || 0) + 1;
const catCover = {};
for (const p of products) for (const c of p.categories) if (!catCover[c] && p.images[0]) catCover[c] = p.images[0];
const categories = TAXONOMY.map(t => ({ ...t, count: catCount[t.slug] || 0, image: catCover[t.slug] || (products[0]?.images[0] || '') }));

const brandCount = {};
for (const p of products) brandCount[p.brand] = (brandCount[p.brand] || 0) + 1;
const brands = Object.entries(brandCount).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, slug: slugify(name), count }));

const categoriesFile = {
  categories,
  brands,
  collections: cols.map(c => ({ slug: c.handle, title: c.title, count: c.products_count, description: stripHtml(c.description) })),
};

await writeFile(new URL('../data/products.json', import.meta.url), JSON.stringify(products, null, 2));
await writeFile(new URL('../data/categories.json', import.meta.url), JSON.stringify(categoriesFile, null, 2));
await writeFile(new URL('./image-manifest.json', import.meta.url), JSON.stringify(imageManifest, null, 2));

// ---- report ----------------------------------------------------------------
console.log(`products.json: ${products.length} products`);
console.log('category counts:', JSON.stringify(catCount));
console.log('brands:', brands.map(b => `${b.name}(${b.count})`).join(', '));
console.log('featured:', products.filter(p => p.featured).length, '| trending:', products.filter(p => p.trending).length, '| new:', products.filter(p => p.categories.includes('new-arrivals')).length, '| sale:', products.filter(p => p.compareAtPrice != null).length, '| drops:', products.filter(p => p.dropDate).length, '| limited:', products.filter(p => p.categories.includes('limited-editions')).length);
console.log('total images to download:', imageManifest.reduce((n, x) => n + x.files.length, 0));
console.log('price range: €' + Math.min(...products.map(p => p.price)) + ' – €' + Math.max(...products.map(p => p.price)));
console.log('\nsample product:\n', JSON.stringify(products.find(p => p.compareAtPrice) || products[0], null, 2).slice(0, 900));
