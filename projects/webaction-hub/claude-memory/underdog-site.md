---
name: underdog-site
description: Showcase build — premium bilingual single-page redesign concept for Underdog pet grooming (Glyfada) at C:\Users\mikef\underdog-site
metadata: 
  node_type: memory
  type: project
  originSessionId: fa8ab9a1-e1a8-4894-b1bc-0bef3636e1a8
---

Showcase/pitch build (2026-07-09) that exercised the full upgraded fleet end to end. Real Athens business chosen autonomously: **Underdog**, pet grooming & care, Δημ. Αγγέλου Μεταξά 42-44, Γλυφάδα 166 74; tel 211 77 07 007; info@theunderdog.gr; IG @theunderdog.gr. Their real site theunderdog.gr is a dated YOOtheme template, so this is a redesign concept/pitch, not their live site.

- **Location:** C:\Users\mikef\underdog-site — now a FULL multi-page site: index.html (cinematic home), services.html, gallery.html, contact.html, sharing assets/css/site.css + assets/js/site.js + assets/js/hero3d.js. `assets/img/img-1..12.jpg` are premium Unsplash placeholder photos downloaded locally (flagged to swap for the client's real photos; Mike's real builds use the business's own full-bleed background photos).
- **Design system "Golden Hour":** warm cream/sand/espresso palette + golden accent; Fraunces (display, Greek-capable) over Manrope (body), fluid clamp() scale, per Nami's `design-standards` warm/wellness recipe.
- **Maxed motion (showcase):** WebGL Three.js hero (drifting golden particles + mouse parallax, hero3d.js), a preloader intro, a custom cursor, word-rise headline reveals, a PINNED horizontal-scroll gallery (GSAP ScrollTrigger), image parallax, magnetic buttons, count-up stats, marquee, all on GSAP 3.13 + Lenis via CDN. Bilingual el/en (Greek default, localStorage toggle).
- **Viewing:** served locally at http://localhost:5183 (python http.server, background) so photos + motion + WebGL actually render (the in-app Launch panel does not serve the sibling assets, which is why photos looked missing). `visual_check.mjs` gained a `?flat` mode (skips preloader/pin, forces reveals) to capture FX-heavy pages.
- **Verified** with visual_check: home + services 0 a11y, 0 console errors, no overflow, all images decoded; contact 1 minor contrast edge node (critical form-label issue fixed). NOT deployed (gated).
- Demonstrates end to end: Nami design-lead + design-standards, the GSAP/Lenis motion stack, the visual self-verification tool, bilingual + accessibility. Next options: deploy to a Vercel preview link, extend to multi-page, or productionize into the marketing starter. See [[nami-design-standards]] and [[house-starters]].
