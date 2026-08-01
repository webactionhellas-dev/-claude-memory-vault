---
name: greencleaners-site
description: Premium bilingual Next.js 15 rebuild of greencleaners.gr in C:\Users\mikef\greencleaners
metadata: 
  node_type: memory
  type: project
  originSessionId: 7ff659ca-fb0e-466e-be2a-88304fe77fb8
---

Full rebuild of **greencleaners.gr** (GREEN CLEANERS — eco dry cleaning, Athens, 7 stores) as a premium bilingual (EL default / EN toggle) marketing site. Location: `C:\Users\mikef\greencleaners`.

**Stack:** Next.js 15 App Router + TS, Tailwind v3 + hand-written shadcn/ui (Radix), Framer Motion, React Hook Form + Zod, Leaflet (CARTO Voyager tiles, no key), Sonner. Design system "eco-luxury": forest green `--primary 162 71% 17%`, sage, soft gold, warm off-white `#FAF9F6`; fonts EB Garamond (display, greek subset) + Inter (body).

**Content is centralized** — edit these, not components: `lib/data.ts` (stores/services/pricing/testimonials/FAQ, all `{el,en}`), `lib/i18n.ts` (UI strings), `lib/site.ts` (phone/email/WhatsApp=6988380756). Store addresses/phones are REAL (scraped from site); `coords` are approximate — verify before launch. Prices are indicative placeholders.

**Booking form** posts to `app/api/booking/route.ts` — a Resend-ready stub that no-ops gracefully without `RESEND_API_KEY`; always offers a pre-filled wa.me hand-off. OG image is generated dynamically (`app/opengraph-image.tsx`).

**Dev-preview gotcha (important):** Tailwind/PostCSS need cwd = project dir. The preview runner spawns from `C:\Users\mikef`, which breaks config discovery (empty `content` → no styles). Fix in place: `.preview-dev.mjs` launcher (gitignored) that pins cwd, wired to launch.json entry **"greencleaners" port 3010**. CLI builds must run with `npm run build --prefix C:\Users\mikef\greencleaners`. See [preview-screenshot-timeout] for verifying without screenshots.

Real logo integrated: their hanger+tree logo (downloaded from old site `wp-content/uploads/2019/10/logo3.png`, low-res 199×117) processed with Pillow → white bg knocked out + trimmed → `public/brand/logo.png` (transparent). Used in navbar + footer (footer frames it in a white chip via `components/logo.tsx` variant). Favicon/apple-icon = `app/icon.png`/`app/apple-icon.png` generated from it; OG image embeds it. Ask client for a vector/hi-res logo to replace.

Copy is ultraprofessional + em-dash-free (verified 0 em dashes in EL/EN rendered text, all pages, metadata, comments, README). Testimonials are styled as Google reviews (4-colour G mark, summary link, per-card badge) driven by `reviewsMeta` in `lib/data.ts` — but the 6 entries are PLACEHOLDERS, clearly flagged. Could NOT fetch real Google reviews via tools (no Places API/scraping; vrisko 403, FB/panelinios no review text). User must paste real reviews (name/rating/text) + set `reviewsMeta` rating/count/url. While count=0 the numeric summary is hidden.

**Design overhaul (2026-06-29):** elevated to "Atelier Vert" editorial eco-luxury. Fonts now Manrope (body) + EB Garamond (display, italic). Deepened tokens (bg `40 24% 93%`, darkened gold `38 56% 42%` for AA, added `--ink` near-black pine + `--sunken`). New effects/components: scroll-progress, kinetic word-reveal hero + parallax + "freshness reveal" filter sweep, magnetic CTAs, count-up stats band (gold-gradient numerals on ink + vignette), cursor-spotlight + tilt bento services, rotating SVG seal, infinite location marquee, editorial section-index numerals (01–06), two-layer shadows, hover-only sheen. All motion gated by useReducedMotion. A senior-designer subagent audit was applied (tonal depth, gold contrast, focus rings, a11y). Homepage ~279kB first load.

**Perf pass (2026-06-29):** code-split the booking form into `booking-form-content.tsx` (RHF+Zod+date-fns+react-day-picker) loaded via next/dynamic only on modal open; Leaflet already lazy. Added `experimental.optimizePackageImports` (framer-motion, lucide-react, date-fns), modern `browserslist` (drops legacy polyfills), `preconnect` to images.unsplash.com, trimmed EB Garamond to weights 400/500/600. Result: homepage First Load JS 279→210kB, inner pages ~250→~181kB; prod `.next/static` ~2.1MB; shared ~102kB. Did NOT use framer-motion LazyMotion (whileInView reveals would risk hiding content). For even faster: swap Unsplash images for local WebP (removes external host + full next/image optimization).

**Real photos + mobile fixes (2026-06-29):** downloaded their actual Pangrati storefront + branded-window photos from greencleaners.gr into `public/photos/` (pangrati-storefront.jpg = hero, pangrati-interior.jpg = about); set in `lib/images.ts` (eco/textiles still Unsplash placeholders). Fixed: hero accent underline now a native gold `underline` (was a fixed-width SVG that overshot when the accent wrapped on mobile); Leaflet map wrapper given `isolate relative z-0` so its z-1000 panes/controls no longer paint over the z-50 navbar (see [[css-fixed-backdrop-filter-trap]] family of stacking issues).

Status: built + verified (build clean, all interactions/i18n/map/mobile/perf/real-photos work). Not deployed; pending = REAL Google reviews from client, hi-res/vector logo, real photos, confirm coords/prices, wire Resend.
