# DRIP — Luxury Sneakers & Streetwear (Athens)

A fast, modern, maintainable storefront for **DRIP**, built with **Astro 5 + Tailwind CSS v4**.
Migrated from a single 47 MB HTML file into a real e‑commerce codebase: **311 products** and
**973 photos** now live as editable data + optimized image assets, not base64.

- ⚡ **Near‑zero JavaScript.** Static HTML by default; interactivity (cart, quick view, filters,
  search) ships as tiny vanilla‑TS islands — no React/Vue runtime.
- 🖼️ **Every image optimized** by Astro to responsive AVIF/WebP, lazy‑loaded.
- 🛒 **Working cart** (localStorage), quick view, advanced shop filters, instant search.
- 🔌 **Checkout‑ready** structure — drop in Stripe / Snipcart / Shopify in one place.

---

## Quick start

```bash
# 1. install
npm install

# 2. run the dev server  →  http://localhost:4321
npm run dev

# 3. production build  →  ./dist
npm run build

# 4. preview the production build locally
npm run preview
```

> Requires Node 18.20+ / 20.3+ / 22+. The first `build` is slow (it generates every
> responsive image variant once) and then caches them under `node_modules/.astro` —
> later builds are fast.

---

## Project structure

```
drip-astro/
├─ astro.config.mjs          # Astro + Tailwind(v4 Vite plugin) + sitemap + image config
├─ tsconfig.json             # strict TS, "@/*" → "src/*"
├─ scripts/
│  └─ extract-from-html.mjs  # one-time migration from the legacy single-file HTML
├─ public/                   # static, served as-is (favicon, robots.txt, /og.jpg)
└─ src/
   ├─ data/
   │  ├─ products.json       # ← SINGLE SOURCE OF TRUTH (311 products)
   │  └─ meta.json           # brand + category facets
   ├─ assets/
   │  ├─ products/           # 973 product photos (optimized at build by Astro)
   │  └─ brand/              # logo
   ├─ lib/
   │  ├─ products.ts         # types, lookups, rails (new/best/sale), facets, sorting
   │  ├─ images.ts           # filename → optimized ImageMetadata resolver
   │  ├─ money.ts            # € formatting + discount %
   │  └─ cart.ts             # localStorage cart store (framework-free, event-driven)
   ├─ components/
   │  ├─ Header.astro  Footer.astro  TrustBar.astro  Icon.astro
   │  ├─ Hero.astro    ProductCard.astro  ProductRail.astro
   │  ├─ CartDrawer.astro     # mini-cart drawer island
   │  ├─ QuickView.astro      # quick-view modal island
   │  └─ SearchOverlay.astro  # ⌘K / “/” instant search island
   ├─ layouts/
   │  └─ BaseLayout.astro     # <head>, SEO/OG, fonts, mounts the global islands
   └─ pages/
      ├─ index.astro                 # home: hero, rails, categories, editorial
      ├─ shop.astro                  # filters + sort + search (client island)
      ├─ brands.astro  about.astro  cart.astro  404.astro
      ├─ product/[slug].astro        # PDP: gallery, sizes, add to bag, related
      ├─ search-index.json.ts        # tiny client-search index (built once)
      └─ api/qv/[slug].json.ts       # per-product quick-view data (built once)
```

---

## Managing products

`src/data/products.json` is the **single source of truth**. Each entry:

```jsonc
{
  "slug": "jordan-1-retro-high-virgil-abloh-archive-alaska", // unique, = URL + image prefix
  "name": "Jordan 1 Retro High Virgil Abloh Archive Alaska",
  "brand": "Jordan",
  "price": 850,
  "compareAtPrice": null,         // set a higher number to show a strikethrough + sale badge
  "category": "sneakers",
  "categories": ["sneakers", "new-arrivals", "basketball", "limited-editions"],
  "colors": [{ "name": "Ink", "hex": "#16181d" }],
  "sizes": ["40", "41", "42", "42.5", "43"],   // EU
  "description": "…",
  "materials": "Premium leather…",
  "badge": "new",                 // "new" | null
  "rating": 4.8,
  "reviews": 100,
  "inStock": true,
  "releaseDate": "2026-04-06",    // drives “Newest” sort + New Arrivals
  "featured": true,               // can appear as the hero / Featured
  "trending": true,               // feeds Best Sellers
  "images": ["jordan-1-…-1.jpg", "jordan-1-…-2.jpg"]   // filenames in src/assets/products/
}
```

**To add a product**

1. Drop its photos into `src/assets/products/` (any JPG/PNG/WebP — Astro optimizes them).
2. Add an object to `products.json`; list the photo filenames in `images` (first = primary).
3. That’s it. The product page, shop listing, search, rails and sitemap update automatically.

No build script needed for day-to-day edits — `scripts/extract-from-html.mjs` was a one-time
migration and never has to run again.

---

## Connecting a real checkout

The bag is fully functional client-side; only the final payment step is stubbed. There is exactly
**one place to wire it up**: the `data-checkout` button handler in
[`src/components/CartDrawer.astro`](src/components/CartDrawer.astro) and
[`src/pages/cart.astro`](src/pages/cart.astro).

- **Stripe** — add `@stripe/stripe-js`, deploy a serverless function (e.g. on Vercel) that creates a
  Checkout Session from `getSnapshot().lines`, then `redirectToCheckout`. Switch Astro to the Vercel/
  Node adapter (`output: 'server'`) for the function, or keep the site static and host the function
  separately.
- **Snipcart** — easiest path: keep the static build, add the Snipcart script in `BaseLayout`, and
  put `data-item-*` attributes on the “Add to Bag” buttons (`ProductCard`, `QuickView`, PDP).
- **Shopify** — use the Storefront API; map each `slug` to a Shopify variant and create a cart/
  checkout URL.

Cart line items already carry everything a checkout needs (`slug`, `name`, `price`, `size`, `qty`).

---

## Deploying

This is a server-rendered (SSR) Astro app on the **@astrojs/vercel** adapter: the storefront pages
render on demand from the live Supabase catalog, and the API routes (checkout, webhook, admin, cron)
run as Vercel functions. A handful of purely static pages (404, about, cart, authentication) are
prerendered at build time. It is NOT a static export; deploy it on Vercel (or any Node host via the
adapter swap), not on a static file host.

Deploy on Vercel: import the repo, framework auto-detected, set the environment variables from
`.env.example`. See `BACKEND.md` for the build-time vs runtime env split and the go-live checklist.

Before going live, set your real domain in `astro.config.mjs` (`SITE`) — it powers canonical URLs and
the sitemap — and replace `public/robots.txt`’s sitemap URL.

---

## Why this is better than the 47 MB single-file version

| | Old single-file HTML | This Astro build |
| --- | --- | --- |
| **Initial load** | ~17–47 MB (everything inline, all photos up front) | **< 1 MB** — only visible images load; rest lazy-load |
| **Images** | base64 (≈ +33% bloat, no caching, no resizing) | responsive **AVIF/WebP**, per-device sizes, cached by the browser & CDN |
| **JavaScript** | one big inline script | tiny vanilla islands, code-split per page |
| **Mobile** | tab crashes / multi-second loads | fast, smooth, memory-safe |
| **SEO** | one route, no metadata | real per-product pages, canonical URLs, OG tags, **JSON-LD**, sitemap |
| **Editing products** | hand-edit a 47 MB file (unusable) | edit a clean `products.json` |
| **Checkout** | none | structured, one-file integration point |

### Key decisions

- **Astro + Tailwind v4** — Astro ships HTML with zero JS unless you opt in, which is the single
  biggest lever for Core Web Vitals on a content/commerce site. Tailwind v4’s CSS-first `@theme`
  keeps the design system in one file (`src/styles/global.css`).
- **Vanilla-TS islands instead of React** — cart, quick view, filters and search are small enough
  that a UI-framework runtime would cost more than it’s worth. The whole site’s JS is a few KB.
- **Data-driven, build-time everything** — products, quick-view JSON, and the search index are all
  generated at build, so the runtime does no work the CDN can’t cache.
- **Light “studio plate” for product photos** — the source photos have white backgrounds; rendering
  them on a subtle light tile with `mix-blend-mode: multiply` makes them read as premium cut-outs on
  the dark theme (and fixes the old “ugly white box” problem) without per-image editing.
- **Single-image galleries fixed** — products with one photo show it full-width (the legacy build
  squeezed it into a 72px thumbnail column).

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `node scripts/extract-from-html.mjs` | (one-time) re-import data + images from the legacy HTML |
