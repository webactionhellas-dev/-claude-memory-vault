import type { ImageMetadata } from 'astro';
import plateColors from '../data/plate-colors.json';

/**
 * Map every product photo filename -> its processed ImageMetadata so that
 * data-driven pages (which only know the filename string from products.json)
 * can still feed Astro's <Image> pipeline and get responsive AVIF/WebP.
 *
 * Eager glob runs at build time; no runtime cost in the browser.
 */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/products/*.{jpg,jpeg,png,webp}',
  { eager: true },
);

const byName = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(modules)) {
  const name = path.split('/').pop();
  if (name) byName.set(name, mod.default);
}

/** A remote/owner-uploaded image (Supabase Storage URL) rather than a bundled asset filename. */
export function isRemoteImage(src: string | undefined): boolean {
  return !!src && /^https?:\/\//.test(src);
}

export function resolveImage(filename: string | undefined): ImageMetadata | undefined {
  return filename ? byName.get(filename) : undefined;
}

export function resolveImages(filenames: string[]): ImageMetadata[] {
  return filenames
    .map((f) => byName.get(f))
    .filter((m): m is ImageMetadata => Boolean(m));
}

/**
 * The studio-background colour of a photo (sampled offline into
 * data/plate-colors.json). The card "plate" is painted this colour so the
 * photo's background dissolves into it = one seamless box. Defaults to white
 * (the ~97% case: shoes on a pure-white studio sweep).
 */
export function plateColor(filename: string | undefined): string {
  return (filename && (plateColors as Record<string, string>)[filename]) || '#ffffff';
}
