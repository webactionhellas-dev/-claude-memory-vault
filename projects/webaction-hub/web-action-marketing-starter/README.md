# Web Action — Marketing Starter

A premium, bilingual (Greek default) **Next.js 15** marketing-site scaffold, de-branded from a real
shipped luxury build. It gives every new local-business or hospitality site the same bones: editorial
motion (Framer Motion), a bilingual el/en system with proper Greek font handling, SEO + JSON-LD, and
security + GDPR wired in from the start. The example content is a two-villa estate; swap it for any
hotel, villa, studio, restaurant, or local brand.

## Stack
- **Next.js 15** App Router, React 19, TypeScript
- **Tailwind CSS 3.4** (bespoke palette in `tailwind.config.ts`)
- **Framer Motion 11** for reveals and micro-interactions
- **lucide-react** icons
- Bilingual el/en with `next/font/local` + Greek fonts (GFS Didot)

## Run it
```bash
npm install
npm run dev      # http://localhost:3000  — runs on the example content
npm run build    # production build
npm start        # serve the build
```

## What is placeholder vs real
- **Identity is neutralized** to placeholders (`Aegean House`, `example.com`, a placeholder phone/handle)
  in `lib/data.ts` (the `site` object) and the layout metadata + JSON-LD. Replace them per client.
- **Media is excluded.** The 150MB+ of real villa photos/video was stripped. `next/image` references
  under `/media/*` resolve to nothing until you add your own to `public/media/` (or point `next.config.mjs`
  `images.remotePatterns` at your CDN; Instagram CDN and Unsplash are already allowed).
- **Fonts:** Hatton + Averta are licensed example fonts kept from the source build. Replace them with your
  own licensed or open fonts per project; do not redistribute them.
- **Example copy** (villa sections, experiences, testimonials) is a luxury hospitality scaffold. Rewrite it
  per client in `lib/data.ts` and the bilingual strings in `lib/i18n.ts`.

## Bilingual (Greek default)
Locale is stored in the `mpv-locale` cookie and read server-side in `app/layout.tsx`. Greek headings use
GFS Didot (a Greek-capable didone) because `next/font`'s metric fallback would otherwise intercept Greek.
Keep that pattern when you swap fonts.

## Motion (house stack)
Elite motion primitives live in `components/motion/` (GSAP + Lenis, the house standard, robust in the headless preview where Framer whileInView freezes):
- `SmoothScroll` (mounted in the layout) drives Lenis smooth scroll synced to GSAP ScrollTrigger. Lenis swallows the native scroll event, so subscribe via `window.__lenis.on("scroll", ...)`.
- `Reveal` scroll-reveals any block; `SplitReveal` does masked line/word/char text reveals (GSAP SplitText); `MagneticButton` for magnetic hover.
- All respect `prefers-reduced-motion`. Prefer these over Framer Motion for new load-critical animation.

See the motion standard in the `design-standards` skill (`references/motion.md`) for the full recipe set across all three tiers, including surgical WebGL heroes (React Three Fiber) and full experiential.

## Security (baked in)
- **Headers** in `next.config.mjs` `headers()`: CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`. The CSP allows Google Fonts, the Instagram CDN, and Next's inline runtime; it uses
  `'unsafe-inline'` for scripts/styles to support hydration, tighten with nonces before a high-security launch.
- **GDPR:** a bilingual consent banner (`components/CookieConsent.tsx`) and a `/privacy` placeholder. Fill the
  policy and controller details before launch.
- **Audit:** `npm run audit:security` (runs `scripts/security_audit.py`) checks secret leakage, `.env`
  hygiene, headers, XSS surface, and `npm audit`. Run it before every deploy.

## Instagram feed (optional)
`lib/instagram.ts` uses the Graph API when `INSTAGRAM_ACCESS_TOKEN` is set, otherwise falls back to
`public/instagram/feed.json`. See `INSTAGRAM.md`.

## Deploy (Vercel)
Import the repo, set env vars per environment, set the real domain (`site.domain` in `lib/data.ts` drives
canonical URLs + OG). Deploy to preview first; promote to production only on an explicit go.

## Start a new site from this template
1. Copy this folder, rename it, `npm install`.
2. Replace the `site` object and copy in `lib/data.ts` and the strings in `lib/i18n.ts`.
3. Add real media to `public/media/`, swap the fonts and favicons, retheme `tailwind.config.ts`.
4. Run `npm run build` and `npm run audit:security`, then deploy to preview.

Nothing here contains real keys or client media. The design and copy are an adaptable example.
