// SERVER ONLY — imports the service-role client. Never import from a client
// `<script>`. Loads the live catalog from Supabase (with a short in-memory
// cache) and swaps it into lib/products.ts so all the existing helpers
// (newArrivals, bySlug, facets, …) work unchanged. Falls back to the static
// products.json when the database isn't configured or is empty.
import { supabaseAdmin, adminReady } from './supabase-admin';
import {
  applyCatalog,
  type Product,
  type BrandFacet,
  type CategoryFacet,
} from './products';
import productData from '@/data/products.json';
import metaData from '@/data/meta.json';

const STATIC_PRODUCTS = productData as Product[];
const META_BRANDS = metaData.brands as BrandFacet[];
const META_CATEGORIES = metaData.categories as CategoryFacet[];

const brandSlug = new Map(META_BRANDS.map((b) => [b.name, b.slug]));
const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');

function rowToProduct(r: any): Product {
  return {
    slug: r.slug,
    name: r.name,
    brand: r.brand,
    price: Number(r.price ?? 0),
    compareAtPrice: r.compare_at_price != null ? Number(r.compare_at_price) : null,
    category: r.category ?? 'sneakers',
    categories: r.categories ?? [],
    colors: r.colors ?? [],
    sizes: r.sizes ?? [],
    description: r.description ?? '',
    materials: r.materials ?? '',
    badge: r.badge ?? null,
    rating: r.rating != null ? Number(r.rating) : null,
    reviews: r.reviews ?? 0,
    inStock: r.in_stock ?? true,
    releaseDate: r.release_date ?? null,
    featured: r.featured ?? false,
    trending: r.trending ?? false,
    images: r.images ?? [],
    plateColor: r.plate_color ?? null,
  };
}

/** Recompute brand + category facets (counts) from a product list. */
function facetsFor(products: Product[]): { brands: BrandFacet[]; categories: CategoryFacet[] } {
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
  const brands: BrandFacet[] = [...counts.entries()]
    .map(([name, count]) => ({ name, slug: brandSlug.get(name) ?? slugify(name), count }))
    .sort((a, b) => b.count - a.count);

  const categories: CategoryFacet[] = META_CATEGORIES.map((c) => ({
    ...c,
    count: products.filter((p) => p.category === c.slug || p.categories.includes(c.slug)).length,
  }));

  return { brands, categories };
}

function applyStatic() {
  applyCatalog({
    products: STATIC_PRODUCTS,
    brands: META_BRANDS.slice().sort((a, b) => b.count - a.count),
    categories: META_CATEGORIES,
  });
}

const TTL = 3000; // ms — keeps rapid same-request reads cheap; edits show within a few seconds
let lastLoad = 0;
let inflight: Promise<void> | null = null;

/**
 * Ensure lib/products.ts holds the current catalog. Call at the top of any
 * server-rendered page/endpoint before using the product helpers.
 */
export async function loadCatalog(force = false): Promise<void> {
  if (!adminReady()) {
    applyStatic();
    return;
  }
  const now = Date.now();
  if (!force && now - lastLoad < TTL) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error || !data || data.length === 0) {
        applyStatic();
      } else {
        const products = data.map(rowToProduct);
        const { brands, categories } = facetsFor(products);
        applyCatalog({ products, brands, categories });
      }
    } catch {
      applyStatic();
    } finally {
      lastLoad = Date.now();
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Force the next loadCatalog() to refetch (call after an admin write). */
export function invalidateCatalog() {
  lastLoad = 0;
}
