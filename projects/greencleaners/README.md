# Green Cleaners - Premium Eco Dry Cleaning (Next.js 15)

A production-ready, fully bilingual (Greek 🇬🇷 / English 🇬🇧) website for **GREEN CLEANERS - Καθαριστήρια Πράσινης Τεχνολογίας**: premium eco dry cleaning & laundry with 7 stores across Attica.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui (Radix) · Framer Motion · React Hook Form + Zod · Leaflet · Sonner**.

---

## ✨ Features

- **Bilingual** with an instant, client-side EL/EN switcher (Greek is the SEO default).
- **Conversion-first**: floating WhatsApp button, sticky "Book a Free Pickup" CTA, and a polished booking modal with success state + WhatsApp hand-off.
- **Interactive store map** (Leaflet + OpenStreetMap/CARTO tiles - no paid API key) with click-to-fly store cards.
- **SEO**: rich metadata, `LocalBusiness` + `Service` JSON-LD (all 7 branches), dynamic `sitemap.xml`, `robots.txt`, and an auto-generated Open Graph image.
- **Premium design system**: deep forest green + sage + soft gold palette, EB Garamond / Inter typography, tasteful Framer Motion micro-interactions, WCAG-minded contrast & focus states, `prefers-reduced-motion` support.
- **Great Core Web Vitals**: `next/image`, `next/font`, an image-free hero (instant LCP), and graceful image fallbacks.

---

## 🚀 Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Build & preview production:

```bash
npm run build
npm start
```

> Requires Node 18.18+ (Node 20/22/24 recommended).

---

## 🗂 Project structure

```
app/
  layout.tsx              # fonts, metadata, JSON-LD, providers, chrome
  page.tsx                # homepage (assembles all sections)
  globals.css             # design tokens + base styles + Leaflet tweaks
  opengraph-image.tsx     # dynamic social share image
  sitemap.ts · robots.ts  # SEO
  not-found.tsx           # bilingual 404
  api/booking/route.ts    # booking endpoint (Resend-ready)
  ypiresies/  times/  katastimata/  pos-leitourgei/  sxetika/  epikoinonia/

components/
  navbar · footer · hero · whatsapp-button · logo
  booking-modal           # RHF + Zod form, success state, WhatsApp hand-off
  store-map · leaflet-map  # interactive locator
  pricing-table · testimonials · faq · cta-section
  services-section · how-it-works · eco-section · pillars
  about-content · contact-content · page-header · section-heading · reveal
  providers/language-provider.tsx
  ui/                     # shadcn-style primitives (button, dialog, …)

lib/
  data.ts                 # 🔑 ALL business content (stores, services, pricing, testimonials, FAQ)
  i18n.ts                 # 🔑 ALL UI strings (EL/EN)
  site.ts                 # 🔑 phone, email, WhatsApp, URL
  images.ts · schema.ts · utils.ts
```

---

## ✏️ Customising content

Almost everything lives in **three files** - no component editing needed:

| What | File |
| --- | --- |
| Phone, WhatsApp, email, site URL | `lib/site.ts` |
| Stores, services, pricing, testimonials, FAQ | `lib/data.ts` |
| Buttons, labels, section titles (EL/EN) | `lib/i18n.ts` |

**Store coordinates:** `lib/data.ts` ships with close approximations for the map. Fine-tune each `coords: { lat, lng }` to the exact storefront (right-click a spot on Google Maps → "What's here?" copies the lat/lng).

**Prices** are indicative starters (`από …`) and clearly labelled as confirmed in store. Edit the `pricing` array freely.

---

## 📧 Connecting the booking form to real email (Resend)

The form works immediately - on submit it always offers a pre-filled WhatsApp message, so no lead is lost. To **also** receive bookings by email:

1. Create an account at [resend.com](https://resend.com) and **verify your domain**.
2. Copy `.env.example` → `.env.local` and fill in:
   ```env
   RESEND_API_KEY=re_xxxxxxxx
   BOOKING_TO_EMAIL=greencleanershellas@gmail.com
   BOOKING_FROM_EMAIL=Green Cleaners <noreply@greencleaners.gr>
   ```
3. Restart / redeploy. `app/api/booking/route.ts` detects the key and emails each booking automatically (it calls the Resend REST API directly - no extra dependency).

> Prefer SendGrid/Mailgun/a CRM webhook? Swap the `fetch` call in `route.ts` - the validated payload is already there.

---

## 🎨 Logo & favicon

The **real Green Cleaners logo** (hanger + tree) is used throughout. The source was processed to a transparent background and trimmed:

- `public/brand/logo-original.png` - the untouched download from the old site.
- `public/brand/logo.png` - transparent, trimmed version used in the navbar & footer (`components/logo.tsx`). The footer frames it in a white chip so the green wordmark stays legible on the dark background.
- `app/icon.png` + `app/apple-icon.png` - favicon / touch icon generated from the logo (Next serves these automatically).
- The social-share image (`app/opengraph-image.tsx`) embeds the logo too.

> The original is low-resolution (199×117). For razor-sharp rendering at any size, ask the client for a **vector (SVG) or high-res transparent PNG** and drop it in as `public/brand/logo.png` (and re-run the favicon step if you want).

## 🖼 Replacing stock images with real photography

Stock photos are referenced in **`lib/images.ts`** (Unsplash). The `<Photo>` component shows a branded gradient if a photo is unavailable, so the layout never breaks.

To use real client photos, drop files into `public/photos/` and point the URLs at them:

```ts
// lib/images.ts
export const images = {
  eco: "/photos/eco-laundry.jpg",
  garments: "/photos/pressed-shirts.jpg",
  about: "/photos/store-interior.jpg",
  textiles: "/photos/folded-textiles.jpg",
};
```

Recommended shots: bright store interiors, perfectly folded/pressed garments, fresh linens, the team at work. Export at ~1600px wide, optimised JP/WebP.

The hero is intentionally **illustration-based** (gradient + floating cards) for a fast LCP - no hero photo needed, but you can add one if desired.

---

## ▲ Deploy to Vercel

1. Push this folder to a GitHub repo.
2. On [vercel.com](https://vercel.com) → **New Project** → import the repo (framework auto-detected as Next.js).
3. Add the environment variables from `.env.example` (Project → Settings → Environment Variables).
4. Set `NEXT_PUBLIC_SITE_URL` to your production domain (e.g. `https://greencleaners.gr`).
5. Deploy. Add your custom domain under **Settings → Domains**.

Other hosts work too (any Node 18.18+ platform): `npm run build && npm start`.

---

## ♿ Accessibility & i18n notes

- Skip-to-content link, focus-visible rings, semantic landmarks, `aria-*` on interactive controls.
- `prefers-reduced-motion` disables animations.
- `<html lang>` updates with the language toggle.

---

## 📌 Suggested next steps

- [ ] Replace stock imagery with real client photography.
- [ ] Confirm exact store coordinates and any second phone numbers.
- [ ] Swap in real testimonials (with consent) - keep them specific & local.
- [ ] Wire up Resend (above) and, optionally, Google Analytics / Meta Pixel.
- [ ] Add a Google Business Profile link per store and real Instagram/Facebook URLs in `lib/site.ts`.
- [ ] Verify final pricing per category with the client.
```
