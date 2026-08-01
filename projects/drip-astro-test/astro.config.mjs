// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// Used for sitemap + canonical URLs. Set PUBLIC_SITE_URL in the environment
// (e.g. the Vercel preview/prod URL); falls back to a placeholder for local dev.
const SITE = process.env.PUBLIC_SITE_URL || 'https://drip.example.com';

export default defineConfig({
  site: SITE,
  // Catalog stays static/prerendered (fast); only routes that opt out with
  // `export const prerender = false` run as Vercel serverless functions
  // (checkout, webhook, auth, account, admin, cron). The Vercel adapter also
  // wires the nightly cron in vercel.json.
  // imageService: true routes astro:assets <Image> through Vercel's image
  // optimizer (/_vercel/image). Required because the storefront is SSR, so
  // Astro's built-in /_image endpoint isn't available on Vercel and 404s
  // (that broke the bundled category-cover images).
  adapter: vercel({ imageService: true }),
  integrations: [sitemap()],
  // Hide the Astro dev toolbar (dev-only overlay; never shipped to visitors anyway).
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // Astro uses sharp to generate responsive AVIF/WebP from the originals at build time.
    responsiveStyles: true,
  },
  build: {
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
});
