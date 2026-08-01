import productData from '@/data/products.json';
import metaData from '@/data/meta.json';

export interface Color {
  name: string;
  hex: string;
}

export interface Product {
  slug: string;
  name: string;
  brand: string;
  price: number;
  compareAtPrice: number | null;
  category: string;
  categories: string[];
  colors: Color[];
  sizes: string[];
  description: string;
  materials: string;
  badge: string | null;
  rating: number | null;
  reviews: number;
  inStock: boolean;
  releaseDate: string | null;
  featured: boolean;
  trending: boolean;
  images: string[];
  /** Sampled studio-background colour of the primary photo (card plate). */
  plateColor?: string | null;
}

export interface BrandFacet {
  name: string;
  slug: string;
  count: number;
}
export interface CategoryFacet {
  slug: string;
  label: string;
  tagline: string;
  count: number;
}

// These start from the static JSON (the build-time / fallback catalog) and are
// swapped to live Supabase data at request time by lib/catalog.ts → applyCatalog().
// `export let` gives consumers a live binding, so helpers below always see the
// current catalog. NOTE: keep this module free of server-only imports (no
// service-role key) — it is safe to import from anywhere.
export let products = productData as Product[];
export let brands = (metaData.brands as BrandFacet[]).slice().sort((a, b) => b.count - a.count);
export let categories = metaData.categories as CategoryFacet[];

/** Swap in a freshly loaded catalog (used by the DB loader). */
export function applyCatalog(next: {
  products: Product[];
  brands: BrandFacet[];
  categories: CategoryFacet[];
}) {
  products = next.products;
  brands = next.brands;
  categories = next.categories;
}

/* ---------- lookups ---------- */
export const bySlug = (slug: string): Product | undefined =>
  products.find((p) => p.slug === slug);

export const inCategory = (cat: string): Product[] =>
  products.filter((p) => p.category === cat || p.categories.includes(cat));

export const byBrand = (brand: string): Product[] =>
  products.filter((p) => p.brand === brand);

/* ---------- curated rails ---------- */
const ts = (p: Product) => (p.releaseDate ? Date.parse(p.releaseDate) : 0);

export const newArrivals = (limit = 8): Product[] =>
  products
    .filter((p) => p.categories.includes('new-arrivals') || p.badge === 'new')
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, limit);

export const bestSellers = (limit = 8): Product[] =>
  products
    .filter((p) => p.trending || (p.rating ?? 0) >= 4.7)
    .sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))
    .slice(0, limit);

export const onSale = (limit = 8): Product[] =>
  products
    .filter((p) => p.compareAtPrice && p.compareAtPrice > p.price)
    .sort((a, b) => b.compareAtPrice! - b.price - (a.compareAtPrice! - a.price))
    .slice(0, limit);

export const featured = (limit = 6): Product[] =>
  products.filter((p) => p.featured).slice(0, limit);

export function related(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.slug !== product.slug)
    .map((p) => {
      let score = 0;
      if (p.brand === product.brand) score += 3;
      score += p.categories.filter((c) => product.categories.includes(c)).length;
      if (Math.abs(p.price - product.price) < 80) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

/* ---------- facets for the shop filters ---------- */
export function facets() {
  const sizeSet = new Set<string>();
  let min = Infinity;
  let max = 0;
  const prices: number[] = [];
  for (const p of products) {
    p.sizes.forEach((s) => sizeSet.add(s));
    min = Math.min(min, p.price);
    max = Math.max(max, p.price);
    prices.push(p.price);
  }
  const sizes = [...sizeSet].sort((a, b) => parseFloat(a) - parseFloat(b));
  const shopCategories = categories.filter(
    (c) => !['new-arrivals', 'sale'].includes(c.slug),
  );

  // Slider ceiling: most of the catalogue sits well below the few ultra-grails
  // (e.g. a €15k AJ1 Dior). Cap the slider at the 98th-percentile price (rounded
  // up to €100) so it stays useful; the handful above it surface as "€cap+".
  prices.sort((a, b) => a - b);
  const p98 = prices[Math.min(prices.length - 1, Math.floor(prices.length * 0.98))] ?? max;
  const priceCap = Math.min(Math.ceil(p98 / 100) * 100 || 100, Math.ceil(max));

  return {
    sizes,
    brands,
    categories: shopCategories,
    priceMin: Math.floor(min),
    priceMax: Math.ceil(max),
    priceCap,
  };
}

/* Sizes the shop should never offer (too small / not stocked) */
const EXCLUDED_SIZES = new Set(['32', '33.5', '35 1/3']);
const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const PACKAGING_SIZES = ['O/S', 'Single Box', 'Whole Box'];

/** Sizes split into clean groups for the filter UI: shoe sizes (EU) vs
 *  clothing sizes vs packaging, with the tiny/unstocked sizes removed. */
export function sizeGroups(): { shoes: string[]; clothing: string[]; other: string[] } {
  const present = new Set(facets().sizes.filter((s) => !EXCLUDED_SIZES.has(s)));
  const clothing = CLOTHING_SIZES.filter((s) => present.has(s));
  const other = PACKAGING_SIZES.filter((s) => present.has(s));
  const known = new Set([...CLOTHING_SIZES, ...PACKAGING_SIZES]);
  const shoes = [...present]
    .filter((s) => !known.has(s))
    .sort((a, b) => parseFloat(a) - parseFloat(b));
  return { shoes, clothing, other };
}

/** First photo for a category (for the brand/category rail tiles). */
export function categoryCover(slug: string): string | undefined {
  return inCategory(slug)[0]?.images[0];
}
export function brandCover(brand: string): string | undefined {
  return byBrand(brand)[0]?.images[0];
}

export type SortKey = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating';

export function sortProducts(list: Product[], key: SortKey): Product[] {
  const arr = list.slice();
  switch (key) {
    case 'price-asc':
      return arr.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return arr.sort((a, b) => b.price - a.price);
    case 'newest':
      return arr.sort((a, b) => ts(b) - ts(a));
    case 'rating':
      return arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    default:
      return arr.sort(
        (a, b) => Number(b.featured) - Number(a.featured) || (b.reviews ?? 0) - (a.reviews ?? 0),
      );
  }
}
