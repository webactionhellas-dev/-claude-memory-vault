# DRIP — Luxury Sneaker Storefront

A clean, fast, fully-functional e-shop for **DRIP** (drip.store), populated with the
**real, live catalogue** scraped from `https://drip.store` and styled to match their brand
(real logo, white studio product tiles, Athens copy).

## View it

```bash
# from this folder
python -m http.server 8761
# open http://localhost:8761/index.html
```
The pages load `data/products.json` via `fetch`, so they must be **served** (a local
server, not `file://`).

## What's inside

| Path | What |
|------|------|
| `index.html` | **Landing page** — hand-built: real DRIP logo, studio-spotlight hero, brand rail, New Arrivals, featured drop, Best Sellers, Sale rail, newsletter. Light & fast (no heavy framework). |
| `shop.html` | **Shop** — all 311 products, filters (category / brand / size / price), sort, live search, brands view. |
| `product.html` | **Product detail** — white gallery, sizes, colours, price, add-to-bag, related (`?handle=<slug>`). |
| `assets/site.css` | Shared design system (dark UI, white product tiles, cyan accent). |
| `assets/shop.js` | Shared header/footer chrome, localStorage cart drawer, search overlay, product-card template. |
| `assets/fonts.css` | Inter + Archivo (extracted from the original template). |
| `assets/brand/drip-logo.png` | The store's real logo (downloaded from their CDN). |
| `data/products.json` | **311 real products** — name, brand, price, compareAtPrice, sizes, colours, images, description, category, ratings, flags. |
| `data/categories.json` | 9 categories, 13 brands, 16 collections (with counts). |
| `assets/images/products/` | **992 product images**, downloaded from drip.store's Shopify CDN (49 MB). |
| `scraper/` | The scraping + data pipeline. |
| `index.compiled.html` | Archived earlier build (real data injected into the original React template). |
| `index.original.html` | Pristine backup of the original supplied template. |

## How the catalogue was obtained

`drip.store` is **Shopify**, so the "hidden feed" is Shopify's public JSON:

- `https://drip.store/products.json?limit=250&page=N` — full catalogue (311 products, 2 pages)
- `https://drip.store/collections.json` — collections / categories
- product images on `cdn.shopify.com`; brand colours/logo from the live theme

**Catalogue completeness** verified three independent ways — `products.json`, the
`all-items` collection, and the XML product sitemap each return exactly **311 handles**,
all imported. Every image is a real drip.store photo (their product shots are 900×540 on
white, so the UI uses square white tiles with `object-fit:contain` — full sneaker, never
cropped). **Nothing is AI-generated; 0 placeholder/Unsplash images remain.**

## Data pipeline (`scraper/`)

```bash
node scraper/build.mjs --fresh   # re-scrape drip.store + re-download all images
node scraper/build.mjs           # rebuild data/*.json from cached raw feed
```

1. `fetch-raw.mjs` — pulls products + collections → `scraper/raw/`
2. `normalize.mjs` — maps Shopify data into the storefront schema → `data/products.json`,
   `data/categories.json`, `scraper/image-manifest.json`
3. `download-images.mjs` — downloads all 992 images (concurrency 16, resumable)

The three HTML pages are hand-authored static files that read `data/products.json` directly,
so the pipeline never regenerates them. (`scraper/inject-*.mjs` are the legacy scripts that
patched the original compiled template — kept for reference; `index.compiled.html` is that build.)

## Design notes

- **Dark, premium UI** with a cyan accent; **white "studio" tiles** for every sneaker so the
  real product photography reads clean (the GOAT/StockX treatment).
- Real **DRIP wordmark** in the header/footer (recoloured white for the dark UI).
- **Performance:** the landing page uses only CSS animations, one `IntersectionObserver` for
  scroll reveals, and a single timer for the hero rotation — no smooth-scroll hijacking or
  per-frame loops, so scrolling stays smooth.
- **Working cart** (localStorage) with a slide-out drawer; instant **search** overlay across
  all 311 products.
