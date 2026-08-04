---
name: zillions-gelato-site
description: cinematic bilingual Next.js 15 + GSAP premium gelato site rebuild in claude projects/zillions
metadata: 
  node_type: memory
  type: project
  originSessionId: 5385cff3-c133-43a9-96b6-6e05b88bcf5f
---

Redesign of **zillions.gr** (real business **ZILLION'S**, premium handmade gelato + specialty coffee + all-day food + bar, Athens, since 2007). Started 2026-07-16.

**Stack/location:** Next.js 15 + React 19 + Tailwind v4 + GSAP/ScrollTrigger + Lenis, TypeScript strict. Project at `claude projects/zillions`. Dev preview on **port 3040** (launch.json name `zillions`). Bilingual **EN/EL** via a client `LanguageProvider` (`src/lib/i18n.tsx`), toggle persists to localStorage. Fonts: **Literata** (display serif, has Greek) + **Inter** (body, has Greek) — Cormorant/Fraunces/Manrope were rejected because they lack a Greek subset.

**Sections (one-page, `src/app/page.tsx`):** Hero (bold, floating scoop parallax) → FlavourMarquee → Flavours (interactive wall, 30 real flavours, filters All/Gelato/Sorbet/Vegan) → Craft (story + stats) → DayParts (Morning→Night scrollytelling, bg colour transitions) → Menu (all-day kitchen, tabbed, REAL Wolt/e-food prices + photos) → Retail (16 jars) → Shops (3 locations + Wolt/e-food order) → SocialStrip (IG gallery + ratings) → Footer.

**Real data facts:** 22 gelato + 8 sorbet (sorbets 100% fruit = vegan/dairy-free). Shops: Kifissia (Dionysou 69), Pagrati (Archimidous 2-6), P. Psychiko (28is Oktovriou 4) + N. Irakleio production workshop. IG @zillions_greece, FB ZillionsIceCream. Ratings: Wolt 9.8/10, e-food 4.9/5. The original site has NO per-flavour descriptions and NO prices (prices came from the Wolt/e-food delivery scrape). Real brand colour is caramel/mocha #B38A6C + chocolate browns.

**Open item to flag to owner:** Wolt lists the Psychiko branch as "Vitsi 4" while the official site + e-food say "28ής Οκτωβρίου 4" — confirm correct street before publishing.

Scraped source assets kept in `zillions/_scrape/` (site + delivery); working images copied to `public/img`. Built with the team agents: TWITCH (scrape), LYRA (bilingual copy deck), NAMI (Craft/Retail/Shops/Footer), CORKY (audit). Real-data-only, no invented flavours/prices. Related: [[webactionhellas-vercel-migration]] (studio deploy pattern).
