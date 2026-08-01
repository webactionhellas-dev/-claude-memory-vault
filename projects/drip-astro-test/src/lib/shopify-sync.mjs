// Runtime-agnostic Shopify → Supabase catalog sync core.
//
// Imported by BOTH:
//   • scripts/sync-shopify.mjs        (Node CLI, manual / one-off)
//   • src/pages/api/cron/sync-shopify (Astro SSR route, Vercel Cron nightly)
//
// Pass in a configured Supabase client; the module only uses the global `fetch`
// and has no `import.meta` / path-alias imports, so it runs unchanged in plain
// Node and inside the Astro/Vercel bundle.
//
// Sync rules (protect work already done):
//   • EXISTING product (slug in DB) → update ONLY volatile commerce fields
//     (price, compareAt, sizes, variants, in_stock, shopify ids); PRESERVE
//     curated fields (name, brand, category/categories, images, featured…).
//   • NEW product → full insert mapped from Shopify, images from Shopify's CDN.
//   • inventory mirrors availability (available → 99, sold-out → 0) since the
//     real stock is enforced by Shopify at its own checkout.

// Shopify vendor → our canonical brand name (must match src/data/meta.json).
export const VENDOR_MAP = {
  'Air Jordan': 'Jordan', 'Nike': 'Nike', 'Nike Air Force': 'Nike', 'ADIDAS': 'Adidas',
  'YEEZY': 'Yeezy', 'ASICS': 'ASICS', 'New Balance': 'New Balance', 'Salomon': 'Salomon',
  'Stone Island x Supreme': 'Stone Island × Supreme', 'Stussy': 'Stüssy',
  'Fear of God': 'Fear of God', 'Essentials': 'Essentials', 'ESSENTIALS': 'Essentials',
  'UGG': 'UGG', 'DRIP': 'Drip Exclusive', 'Drip Exclusive': 'Drip Exclusive',
};
export const TYPE_MAP = {
  'Sneakers': 'sneakers', 'Clothing': 'clothing', 'Clothes': 'clothing', 'Tops': 'clothing',
  'Accesorries': 'accessories', 'Accessories': 'accessories', '': 'sneakers',
};

const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const dedupe = (a) => [...new Set(a)];

/** Pull the entire catalog from a Shopify store's public products.json. */
export async function fetchAllShopify(storeUrl) {
  const base = String(storeUrl).replace(/\/+$/, '');
  const all = [];
  for (let page = 1; page < 50; page++) {
    const res = await fetch(`${base}/products.json?limit=250&page=${page}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (drip-sync)' },
    });
    if (!res.ok) throw new Error(`Shopify ${base} page ${page} → HTTP ${res.status}`);
    const { products } = await res.json();
    if (!products?.length) break;
    all.push(...products);
    if (products.length < 250) break;
  }
  return all;
}

/** Extract the volatile, always-synced fields from a Shopify product. */
function volatileFields(p, unmapped) {
  const brand = VENDOR_MAP[p.vendor] ?? (unmapped.add(p.vendor), p.vendor);
  const variants = (p.variants || []).map((v) => ({
    size: v.option1 ?? v.title ?? 'OS',
    variant_id: v.id,
    price: Number(v.price) || 0,
    compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
    available: !!v.available,
  }));
  const prices = variants.map((v) => v.price).filter((n) => n > 0);
  const price = prices.length ? Math.min(...prices) : 0;
  const caps = variants.map((v) => v.compare_at_price).filter((n) => n && n > 0);
  const compareAt = caps.length ? Math.max(...caps) : null;
  const compare_at_price = compareAt && compareAt > price ? compareAt : null;
  return {
    brand,
    variants,
    price,
    compare_at_price,
    sizes: dedupe(variants.map((v) => v.size)),
    in_stock: variants.some((v) => v.available),
    shopify_product_id: p.id,
    shopify_updated_at: p.updated_at,
  };
}

const _med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const _hx = (v) => Math.round(v).toString(16).padStart(2, '0');

/**
 * Sample a photo's studio-background colour (median of 8 edge blocks) so the
 * card plate can be painted the same colour → the photo dissolves into it with
 * no hard rectangle. Uses a tiny Shopify thumbnail so it's cheap. Same method
 * as scripts/plate-colors.mjs, kept in sync.
 */
async function samplePlate(url) {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}width=120`, { headers: { 'User-Agent': 'Mozilla/5.0 (drip-sync)' } });
  if (!res.ok) throw new Error(`img ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels;
  const s = Math.max(2, Math.min(8, Math.floor(Math.min(w, h) / 12)));
  const pts = [[0, 0], [w - s, 0], [0, h - s], [w - s, h - s], [(w - s) >> 1, 0], [(w - s) >> 1, h - s], [0, (h - s) >> 1], [w - s, (h - s) >> 1]];
  const rs = [], gs = [], bs = [];
  for (const [bx, by] of pts) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = ((by + y) * w + (bx + x)) * ch;
      if (data[i + 3] < 200) continue;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    if (n) { rs.push(r / n); gs.push(g / n); bs.push(b / n); }
  }
  if (!rs.length) return '#ffffff';
  return '#' + _hx(_med(rs)) + _hx(_med(gs)) + _hx(_med(bs));
}

/**
 * Sync the whole catalog. Returns a summary; only writes when `write` is true.
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {{ storeUrl?: string, write?: boolean, log?: (m: string) => void }} [opts]
 */
export async function syncShopifyCatalog(sb, { storeUrl = 'https://drip.store', write = false, log = () => {}, sampleImages = true, maxSamples = Infinity } = {}) {
  const unmapped = new Set();
  const shopify = await fetchAllShopify(storeUrl);
  log(`Shopify catalog: ${shopify.length} products`);

  const CURATED = 'slug,name,brand,category,categories,colors,description,materials,badge,rating,reviews,images,featured,trending,release_date,sort_order,price,compare_at_price,shopify_product_id,plate_color,plate_src';
  const { data: existingRows, error: exErr } = await sb.from('products').select(CURATED);
  if (exErr) throw new Error(`read products: ${exErr.message}`);
  const existing = new Map((existingRows || []).map((r) => [r.slug, r]));
  let maxSort = Math.max(0, ...(existingRows || []).map((r) => r.sort_order ?? 0));

  const rows = [];
  const rowBySlug = new Map();
  const plateJobs = []; // primary photos whose plate colour needs (re)sampling
  const inv = new Map(); // slug → Map<size, qty>
  const changes = [];
  let inserted = 0, updated = 0, onSale = 0, soldOut = 0;

  for (const p of shopify) {
    const vol = volatileFields(p, unmapped);
    if (vol.compare_at_price) onSale++;
    if (vol.variants.some((v) => !v.available)) soldOut++;
    const prior = existing.get(p.handle);
    const shopifyImages = (p.images || []).map((i) => i.src);
    const tags = (p.tags || []).map((t) => String(t).toLowerCase());
    const isNewIn = tags.includes('new in');
    const isBest = tags.includes('best seller');
    const desc = stripHtml(p.body_html);
    const baseCat = TYPE_MAP[p.product_type] ?? 'sneakers';

    if (prior) {
      updated++;
      if (Number(prior.price) !== vol.price || (prior.compare_at_price ?? null) !== (vol.compare_at_price ?? null)) {
        changes.push({ slug: p.handle, oldP: Number(prior.price), newP: vol.price, oldC: prior.compare_at_price, newC: vol.compare_at_price });
      }
      // Shopify still mirrors catalogue edits (title, photos, description, sizes,
      // stock). PRICE + compare_at are now SITE-OWNED: the owner runs pricing off
      // StockX and the backend is moving off Shopify, so we PRESERVE the DB values
      // and never overwrite them from Shopify on an update. New products still take
      // Shopify's price on first insert (below). Curation stays as enrichment.
      const priorCats = (prior.categories || []).filter((c) => c !== 'new-arrivals' && c !== 'sale');
      // Sale tag now follows the SITE-OWNED compare_at, not Shopify's.
      const onSaleNow = prior.compare_at_price != null && Number(prior.compare_at_price) > Number(prior.price);
      const categories = dedupe([...priorCats, ...(isNewIn ? ['new-arrivals'] : []), ...(onSaleNow ? ['sale'] : [])]);
      rows.push({
        slug: p.handle,
        name: p.title || prior.name,
        brand: vol.brand,
        description: desc || prior.description,
        images: shopifyImages.length ? shopifyImages : prior.images,
        badge: isNewIn ? 'new' : null,
        price: prior.price, compare_at_price: prior.compare_at_price ?? null, sizes: vol.sizes,
        variants: vol.variants, in_stock: vol.in_stock,
        category: prior.category, categories,
        colors: prior.colors, materials: prior.materials,
        rating: prior.rating, reviews: prior.reviews,
        featured: prior.featured, trending: isBest,
        release_date: prior.release_date, sort_order: prior.sort_order ?? 0,
        shopify_product_id: vol.shopify_product_id, shopify_updated_at: vol.shopify_updated_at,
      });
    } else {
      inserted++;
      rows.push({
        slug: p.handle,
        name: p.title, brand: vol.brand, category: baseCat,
        categories: dedupe([baseCat, ...(isNewIn ? ['new-arrivals'] : []), ...(vol.compare_at_price ? ['sale'] : [])]),
        colors: [], description: desc, materials: '',
        badge: isNewIn ? 'new' : null, rating: null, reviews: 0,
        images: shopifyImages,
        featured: false, trending: isBest,
        release_date: p.published_at ? p.published_at.slice(0, 10) : null,
        sort_order: ++maxSort,
        price: vol.price, compare_at_price: vol.compare_at_price, sizes: vol.sizes,
        variants: vol.variants, in_stock: vol.in_stock,
        shopify_product_id: vol.shopify_product_id, shopify_updated_at: vol.shopify_updated_at,
      });
    }

    // Queue a plate-colour sample when the primary photo is new or changed, so
    // an added/swapped photo gets a matched soft edge like every other product.
    const row = rows[rows.length - 1];
    rowBySlug.set(row.slug, row);
    const primaryUrl = shopifyImages[0] || prior?.images?.[0] || null;
    if (primaryUrl && (!prior || prior.plate_src !== primaryUrl || prior.plate_color == null)) {
      plateJobs.push({ slug: row.slug, url: primaryUrl });
    } else {
      row.plate_color = prior?.plate_color ?? null;
      row.plate_src = prior?.plate_src ?? primaryUrl ?? null;
    }

    let sizes = inv.get(p.handle);
    if (!sizes) { sizes = new Map(); inv.set(p.handle, sizes); }
    for (const v of vol.variants) {
      const q = v.available ? 99 : 0;
      const prev = sizes.get(v.size);
      if (prev == null || q > prev) sizes.set(v.size, q); // available wins on duplicate sizes
    }
  }

  // Products we previously pulled from Shopify but that are gone from the current
  // feed (unpublished or deleted) → prune them from the storefront.
  const shopifySlugs = new Set(shopify.map((p) => p.handle));
  const removable = (existingRows || [])
    .filter((r) => r.shopify_product_id != null && !shopifySlugs.has(r.slug))
    .map((r) => r.slug);

  const summary = { total: shopify.length, inserted, updated, removed: removable.length, onSale, soldOut, changes, unmappedVendors: [...unmapped], platesToSample: plateJobs.length };
  if (!write) return summary;

  // Sample plate colours for new/changed primary photos (matched soft edge).
  if (sampleImages && plateJobs.length) {
    const todo = plateJobs.slice(0, maxSamples);
    const CONC = 8;
    let sampled = 0;
    await Promise.all(
      Array.from({ length: CONC }, (_, k) => todo.filter((_, i) => i % CONC === k)).map(async (list) => {
        for (const job of list) {
          const r = rowBySlug.get(job.slug);
          const prior = existing.get(job.slug);
          try { r.plate_color = await samplePlate(job.url); r.plate_src = job.url; sampled++; }
          catch { r.plate_color = prior?.plate_color ?? null; r.plate_src = prior?.plate_src ?? null; }
        }
      }),
    );
    // any beyond the cap keep their prior colour and get retried next run
    for (const job of plateJobs.slice(maxSamples)) {
      const r = rowBySlug.get(job.slug); const prior = existing.get(job.slug);
      r.plate_color = prior?.plate_color ?? null; r.plate_src = prior?.plate_src ?? null;
    }
    summary.platesSampled = sampled;
    log(`  sampled ${sampled} plate colour(s)`);
  } else {
    for (const job of plateJobs) {
      const r = rowBySlug.get(job.slug); const prior = existing.get(job.slug);
      r.plate_color = prior?.plate_color ?? null; r.plate_src = prior?.plate_src ?? null;
    }
  }

  // bulk upsert products
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await sb.from('products').upsert(rows.slice(i, i + 100), { onConflict: 'slug' });
    if (error) throw new Error(`upsert products: ${error.message}`);
    log(`  upserted ${Math.min(i + 100, rows.length)}/${rows.length}`);
  }

  // refresh inventory = availability
  const slugs = rows.map((r) => r.slug);
  for (let i = 0; i < slugs.length; i += 200) {
    const { error } = await sb.from('inventory').delete().in('product_slug', slugs.slice(i, i + 200));
    if (error) throw new Error(`inventory delete: ${error.message}`);
  }
  const invRows = [];
  for (const [slug, sizes] of inv) for (const [size, quantity] of sizes) invRows.push({ product_slug: slug, size, quantity });
  for (let i = 0; i < invRows.length; i += 500) {
    const { error } = await sb.from('inventory').insert(invRows.slice(i, i + 500));
    if (error) throw new Error(`inventory insert: ${error.message}`);
  }
  log(`  refreshed inventory: ${invRows.length} size rows`);

  // Prune removed products. Guard: only when we clearly got a full feed, so a
  // transient partial fetch can never wipe the catalogue.
  if (removable.length && shopify.length >= 50) {
    await sb.from('inventory').delete().in('product_slug', removable);
    const { error } = await sb.from('products').delete().in('slug', removable);
    if (error) throw new Error(`remove products: ${error.message}`);
    log(`  removed ${removable.length} product(s) no longer in Shopify`);
  }

  summary.inventoryRows = invRows.length;
  return summary;
}
