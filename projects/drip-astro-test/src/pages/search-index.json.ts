import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { loadCatalog } from '@/lib/catalog';
import { products } from '@/lib/products';
import { resolveImage, isRemoteImage } from '@/lib/images';

export const prerender = false;

// Client-search index: served live so owner edits/additions are searchable.
export const GET: APIRoute = async () => {
  await loadCatalog();
  const items = await Promise.all(
    products.map(async (p) => {
      const meta = resolveImage(p.images[0]);
      const image = meta
        ? (await getImage({ src: meta, width: 96, format: 'webp' })).src
        : isRemoteImage(p.images[0])
          ? p.images[0]
          : '';
      return { slug: p.slug, name: p.name, brand: p.brand, price: p.price, image };
    }),
  );
  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json' },
  });
};
