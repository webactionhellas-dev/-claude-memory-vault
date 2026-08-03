---
name: seashepherd-redesign
description: Cinematic Next.js 15 concept rebuild of seashepherdglobal.org in the claude projects dir
metadata: 
  node_type: memory
  type: project
  originSessionId: 1a46a424-ff9f-46fd-971f-1ab4139f48ea
---

Concept redesign of the Sea Shepherd Global website ("DEFEND THE OCEAN"), built 2026-06-18 in `C:\Users\nospa\claude projects\sea-shepherd`.

Stack: Next.js 15 (App Router) + TypeScript, Tailwind, Framer Motion, GSAP/ScrollTrigger, Lenis smooth scroll, Three.js + React Three Fiber + drei, lucide-react, shadcn-style Button (Radix Slot + CVA).

Theme (current): black backgrounds / white text+glass / ember-orange (#ff5a1f) accent only. Type: Fraunces (display serif, --font-fraunces) + Archivo (body, --font-archivo). Palette is centralized: Tailwind keeps the old token KEY names (`abyss`=black scale, `ocean`=orange, `cyan`=white) so usages remap without touching every file; hardcoded hex live in globals.css utilities (.text-gradient, .kicker, .glass, .border-glow, scrollbar), button.tsx, hero.tsx (logo glow), why-oceans gauge, globe.tsx (shader/pins/lights). To restyle accent again, change those + tailwind tokens.

10 sections (hero WebGL ocean shader, horizontal why-oceans, interactive threats, tilt-card campaigns, impact timeline, R3F globe, video stories, count-up impact numbers, masonry news, support CTA) + custom cursor, loading screen, ambient particles, Web Audio ocean sound toggle.

Run: `npm install` then `npm run dev` (port 3000) from the sea-shepherd folder. Verified: build + `tsc --noEmit` pass; three.js code-split via dynamic ssr:false.

Imagery: real Sea Shepherd photos downloaded from their CDN (static.seashepherdglobal.org) into `/public/images` (23 files: why-01..03, threat-*, campaign-*, story-*, hero-ship, logo-roundel.png = their actual emblem). `<Media>` keeps a gradient fallback. Hero is logo-centric: centered roundel emblem + deep-sea photo Slideshow (5s crossfade) + god rays/bubbles, no WebGL wave plane (ocean-scene.tsx now unused). Mobile nav menu has a rotating photo backdrop (Slideshow, 3.5s). Why-Oceans gap fixed with an animated SVG gauge + fact chips. NOTE: horizontal-scroll translateX % is relative to strip width → use `-(panelCount-1)/panelCount*100%`, not `*100`. Related: [[kyconstruction-rebuild]], [[eposburger-site]].
