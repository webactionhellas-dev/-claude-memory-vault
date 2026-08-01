# Mykonos Prestige Villas

An ultra-premium, cinematic redesign of **mykonosprestigevillas.gr** — two private
Cycladic estates (Villa Thalassa & Villa Anemos) above Kastro, Mykonos.

Built to feel Aman-level: the original hero video as centerpiece, buttery scroll
reveals, magnetic buttons, 3D tilt cards, parallax panoramas, a masonry gallery with
lightbox, and a live-capable Instagram feed.

**Design system — "Aegean Whitewash":** whitewashed white, soft Cycladic sky-blue,
azure accent, deep-sea navy, soft ink. Professional and airy · the brand's own
**PP Hatton** (display) + **Averta** (body), self-hosted from `public/fonts/`.

---

## Stack

- **Next.js 15** (App Router) · React 19 · TypeScript
- **Tailwind CSS 3.4** (bespoke Aegean palette in `tailwind.config.ts`)
- **Framer Motion 11** for all animation
- **lucide-react** icons
- Brand fonts (PP Hatton + Averta) self-hosted via `next/font/local`

## Run it

```bash
npm install
npm run dev      # → http://localhost:3030
npm run build    # production build
npm start        # serve the build
```

## Structure

```
app/
  layout.tsx            # fonts, SEO metadata, JSON-LD (LodgingBusiness)
  page.tsx              # section composition
  globals.css           # design system, placeholder + grain/vignette helpers
  api/instagram/route.ts# live feed endpoint (Graph API → static fallback)
components/
  Navbar, Hero, WelcomeStory, Villas, Experiences,
  Gallery, InstagramFeed, Location, Testimonials, Footer, FloatingCTA
  ui/  Reveal · MagneticButton · TiltCard · Lightbox
lib/
  data.ts               # ALL copy, villa specs, experiences, testimonials
  instagram.ts          # Graph API fetch + static fallback
  utils.ts              # cn() helper
public/
  media/real/           # real assets pulled from the live site (video, photos, logos)
  media/placeholders/   # Cycladic line-art used by placeholder tiles
  instagram/feed.json   # placeholder feed (swap for real posts — see INSTAGRAM.md)
```

## Content — one file to rule them all

Almost everything is in **`lib/data.ts`**: contact details, booking URL, villa
specs/amenities/galleries, experiences, testimonials. Edit there, not in components.

`// TODO` comments flag the few things to tailor (e.g. the real reservation-engine URL,
currently defaulted to WhatsApp).

## Real assets already wired in

Pulled from the existing site and reused legitimately (they're your own files):

- `intro.webm` / `intro_mobile.webm` — the hero video (mobile encode auto-served ≤768px)
- `thalassa_exp.webp`, `anemos.webp` + thumbnails — villa photography
- `logo-white.svg`, `logo-black.svg`, `og.webp`

## Replacing the Instagram placeholders

Every placeholder tile is labeled **"Replace with @mykonosprestigevillas · …"**.
See **[INSTAGRAM.md](INSTAGRAM.md)** for three ways to fill them:

- **A** — live Graph API feed (set `INSTAGRAM_ACCESS_TOKEN`, hands-off forever)
- **B** — manual curation via `public/instagram/feed.json`
- **C** — bulk download tools (`instaloader`, `gallery-dl`, `yt-dlp`) for your own account

## Conversion & SEO

- Booking CTAs in the nav, hero, each villa, experiences, and footer (all → WhatsApp/booking URL)
- Floating WhatsApp button + gold scroll-progress bar
- Full OpenGraph/Twitter metadata, keyword set, and `LodgingBusiness` structured data
- Targets: *Mykonos luxury villas · private villas Kastro · Villa Thalassa / Anemos*

## Deploy

Any Next.js host (Vercel recommended). Add `INSTAGRAM_ACCESS_TOKEN` as an env var to
enable the live feed. Everything else is static-friendly.
