import 'server-only';
import { unstable_cache } from 'next/cache';
import {
  ARTISTS,
  BACKGROUNDS,
  FEATURED_WORK,
  INSTAGRAM_FALLBACK,
  LOCATIONS,
  SITE,
  workSrc,
  type Artist,
  type GalleryItem,
  type LocationId,
  type SpecialtyId,
  type StudioLocation,
  type WorkItem
} from '@/lib/content';
import type {
  ArtistRow,
  FeaturedWorkRow,
  InstagramPostRow,
  PiercingPhotoRow,
  PortfolioItemRow,
  SiteContentRow,
  SiteSettingRow,
  StudioRow
} from './types';

/**
 * Server-side CMS reads: Supabase (PostgREST, anon key) with the bundled
 * content in src/lib/content.ts and src/messages/*.json as the always-working
 * fallback. The public site must NEVER break or block on Supabase:
 * - every request carries a hard timeout,
 * - any failure returns null and the bundled data renders instead,
 * - results are cached via unstable_cache (tag: "cms") so page loads do not
 *   hit the database; the admin panel revalidates the tag on save.
 */

export const CMS_TAG = 'cms';
const FETCH_TIMEOUT_MS = 4000;

function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

/** GET a PostgREST path; null on any failure (timeout, HTTP error, bad JSON). */
async function fetchRows<T>(path: string): Promise<T[] | null> {
  const env = supabaseEnv();
  if (!env) return null;
  try {
    const res = await fetch(`${env.url}/rest/v1/${path}`, {
      headers: { apikey: env.key, Authorization: `Bearer ${env.key}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as T[]) : null;
  } catch {
    return null;
  }
}

/**
 * Only let http(s) URLs from the database reach an <a href>. A settings value
 * is admin-writable, so an owner (or leaked owner credentials) could otherwise
 * store a "javascript:" link that would run on a visitor click. Anything that
 * is not a plain http(s) URL falls back to the trusted bundled value. Relative
 * image paths for backgrounds are inert in <img src> and keep their own path.
 */
function safeHttpUrl(value: string | null | undefined, fallback: string): string {
  const v = typeof value === 'string' ? value.trim() : '';
  return /^https?:\/\//i.test(v) ? v : fallback;
}

/* ------------------------------------------------------------------ */
/* Text overrides (site_content -> next-intl messages)                 */
/* ------------------------------------------------------------------ */

async function loadMessageOverrides(locale: string): Promise<Record<string, string>> {
  const rows = await fetchRows<SiteContentRow>(
    `site_content?select=key,value&locale=eq.${encodeURIComponent(locale)}`
  );
  if (!rows) return {};
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (typeof row.key === 'string' && typeof row.value === 'string') {
      out[row.key] = row.value;
    }
  }
  return out;
}

/** Flattened text overrides for a locale, cached under the "cms" tag. */
export function getMessageOverrides(locale: string): Promise<Record<string, string>> {
  return unstable_cache(() => loadMessageOverrides(locale), ['cms-messages', locale], {
    tags: [CMS_TAG],
    revalidate: 3600
  })();
}

/* ------------------------------------------------------------------ */
/* Structured content (artists, works, studios, media, settings)       */
/* ------------------------------------------------------------------ */

export interface CmsData {
  artists: Artist[];
  gallery: GalleryItem[];
  artistFilters: { id: string; name: string }[];
  locations: StudioLocation[];
  featured: WorkItem[];
  instagram: { id: string; src: string; href: string }[];
  piercingPhotos: { id: string; src: string }[];
  piercingIntroImage: string;
  backgrounds: { hero: string; cta: string; banner: string; footer: string };
  social: { instagram: string; instagramHandle: string; facebook: string };
}

const DEFAULT_PIERCING_PHOTOS = [2, 6, 9, 11, 14, 16, 18, 21, 24, 27, 30, 32].map((n) => ({
  id: `p-${n}`,
  src: workSrc(n)
}));

const DEFAULT_FOOTER_BG = '/images/bg/footer-bg.jpg';

function mapArtists(rows: ArtistRow[] | null, items: PortfolioItemRow[] | null): Artist[] {
  if (!rows || rows.length === 0) return [...ARTISTS];

  const bySlug = new Map<string, PortfolioItemRow[]>();
  if (items) {
    for (const item of items) {
      const list = bySlug.get(item.artist_slug) ?? [];
      list.push(item);
      bySlug.set(item.artist_slug, list);
    }
  }

  return rows.map((row) => {
    const dbWork = bySlug.get(row.slug);
    const bundled = ARTISTS.find((a) => a.slug === row.slug);
    // DB works win; if the works query failed or the artist has none yet,
    // fall back to the bundled set for that artist.
    const work =
      dbWork && dbWork.length > 0
        ? dbWork.map((w) => ({ src: w.src, ar: Number(w.ar) || 1 }))
        : (bundled?.work ?? []);
    return {
      slug: row.slug,
      name: row.name,
      styles: row.styles ?? [],
      location: (row.locations ?? []).filter(
        (l): l is LocationId => l === 'glyfada' || l === 'corfu'
      ),
      portrait: row.portrait,
      bioEl: row.bio_el,
      bioEn: row.bio_en,
      work,
      instagram: row.instagram ?? undefined
    };
  });
}

function mapStudios(rows: StudioRow[] | null): StudioLocation[] {
  if (!rows || rows.length === 0) return [...LOCATIONS];
  return rows.map((row) => {
    const id = (row.id === 'corfu' ? 'corfu' : 'glyfada') as LocationId;
    const bundled = LOCATIONS.find((l) => l.id === id);
    return {
      id,
      city: row.city,
      cityEl: row.city_el,
      street: row.street,
      streetEl: row.street_el,
      postalCode: row.postal_code,
      region: row.region,
      note: row.note ?? undefined,
      noteEl: row.note_el ?? undefined,
      phone: row.phone,
      phoneHref: `tel:${row.phone.replace(/[^+\d]/g, '')}`,
      email: row.email,
      geo: { lat: Number(row.lat), lng: Number(row.lng) },
      place: { ftid: row.place_ftid, name: row.place_name },
      mapsUrl: safeHttpUrl(row.maps_url, bundled?.mapsUrl ?? '#')
    };
  });
}

function mapFeatured(rows: FeaturedWorkRow[] | null): WorkItem[] {
  if (!rows || rows.length === 0) return [...FEATURED_WORK];
  return rows.map((row) => ({
    id: row.id,
    style: row.style as SpecialtyId,
    src: row.src,
    alt: row.alt_en,
    altEl: row.alt_el
  }));
}

async function loadCms(): Promise<CmsData> {
  const [artistRows, itemRows, studioRows, featuredRows, instaRows, piercingRows, settingRows] =
    await Promise.all([
      fetchRows<ArtistRow>('artists?select=*&order=sort.asc,slug.asc'),
      fetchRows<PortfolioItemRow>('portfolio_items?select=*&order=sort.asc,id.asc'),
      fetchRows<StudioRow>('studios?select=*&order=sort.asc'),
      fetchRows<FeaturedWorkRow>('featured_work?select=*&order=sort.asc'),
      fetchRows<InstagramPostRow>('instagram_posts?select=*&order=sort.asc'),
      fetchRows<PiercingPhotoRow>('piercing_photos?select=*&order=sort.asc'),
      fetchRows<SiteSettingRow>('site_settings?select=key,value')
    ]);

  const settings = new Map<string, string>();
  if (settingRows) {
    for (const row of settingRows) {
      if (typeof row.key === 'string' && typeof row.value === 'string' && row.value) {
        settings.set(row.key, row.value);
      }
    }
  }
  const setting = (key: string, fallback: string) => settings.get(key) ?? fallback;

  const artists = mapArtists(artistRows, itemRows);
  const gallery: GalleryItem[] = artists.flatMap((a) =>
    a.work.map((w, i) => ({ id: `${a.slug}-${i}`, src: w.src, ar: w.ar, artist: a.slug }))
  );

  return {
    artists,
    gallery,
    artistFilters: artists.map((a) => ({ id: a.slug, name: a.name })),
    locations: mapStudios(studioRows),
    featured: mapFeatured(featuredRows),
    instagram:
      instaRows && instaRows.length > 0
        ? instaRows.map((r) => ({
            id: r.id,
            src: r.src,
            href: safeHttpUrl(r.href, SITE.social.instagram)
          }))
        : INSTAGRAM_FALLBACK.map((p) => ({ id: p.id, src: p.src, href: p.href })),
    piercingPhotos:
      piercingRows && piercingRows.length > 0
        ? piercingRows.map((r) => ({ id: r.id, src: r.src }))
        : DEFAULT_PIERCING_PHOTOS,
    piercingIntroImage: setting('piercing.introImage', workSrc(6)),
    backgrounds: {
      hero: setting('background.hero', BACKGROUNDS.hero),
      cta: setting('background.cta', BACKGROUNDS.cta),
      banner: setting('background.banner', BACKGROUNDS.banner),
      footer: setting('background.footer', DEFAULT_FOOTER_BG)
    },
    social: {
      instagram: safeHttpUrl(settings.get('social.instagram'), SITE.social.instagram),
      instagramHandle: setting('social.instagramHandle', SITE.social.instagramHandle),
      facebook: safeHttpUrl(settings.get('social.facebook'), SITE.social.facebook)
    }
  };
}

/** The merged CMS content (DB wins, bundled data is the fallback), cached. */
export const getCms: () => Promise<CmsData> = unstable_cache(loadCms, ['cms-data'], {
  tags: [CMS_TAG],
  revalidate: 3600
});
