import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { SITE, TATTOO_STYLES } from '@/lib/content';
import { getCms } from '@/lib/cms/data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? SITE.url;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // CMS-managed artist list (bundled data as fallback). /admin is deliberately
  // absent: the panel is noindex and never advertised.
  const { artists } = await getCms();
  const paths = [
    '',
    '/portfolio',
    '/artists',
    '/piercing',
    '/about',
    '/studios',
    ...artists.map((a) => `/artists/${a.slug}`),
    ...TATTOO_STYLES.map((s) => `/portfolio/${s}`)
  ];

  const entries: MetadataRoute.Sitemap = [];
  for (const path of paths) {
    for (const locale of routing.locales) {
      const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
      entries.push({
        url: `${SITE_URL}${prefix}${path}`,
        lastModified: new Date(),
        changeFrequency: path === '' ? 'weekly' : 'monthly',
        priority: path === '' ? 1 : path.startsWith('/artists/') ? 0.6 : 0.8,
        alternates: {
          languages: {
            el: `${SITE_URL}${path}`,
            en: `${SITE_URL}/en${path}`
          }
        }
      });
    }
  }
  return entries;
}
