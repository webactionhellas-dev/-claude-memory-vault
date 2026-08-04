---
name: drip-jewels-site
description: "Drip Jewels luxury watch & jewelry site (tiffany blue, no e-commerce) in claude projects/drip-jewels"
metadata: 
  node_type: memory
  type: project
  originSessionId: aab483f0-c263-4f13-8a0c-a5233297a568
---

Ultra-luxury **watch & jewelry house** site in `claude projects/drip-jewels` (Next.js 15 App Router + TS, Tailwind v4, Framer Motion, lucide-react). Dev on port 3003 (`drip-jewels` in launch.json). NOT the sneaker [[drip-store-site]] / [[drip-astro-store]].

**Real brand facts (from their Instagram, scraped 2026-06-23):**
- Drip Jewels — "Luxury Watches | Diamonds | Jewelry", *Opening Soon*.
- Location: **Florida Mall, Leof. Dimarchou Angelou Metaxa 33, Glyfada, Greece 16674**.
- Accounts: @dripjewels_gr (flagship), @vs.dripjewels (Vasilis Syregos — sells new & second-hand certified watches/jewelry), sisters @drip_athens @dripbarbershop.
- Inventory aesthetic: Rolex (Submariner 126610LN, rose-gold Daytona, Day-Date, green Datejust), Richard Mille, Cartier Santos (iced + skeleton), AP Royal Oak, Patek Nautilus, fully iced-out diamond pieces, cinematic editorial.

**Brand color = Tiffany blue** (sampled from logo): primary ~#1FBFC0 / #2BC4CE, NOT gold. Dark base #0C0C0C. Logo = cyan italic "Drip JEWELS" + diamond + ©.

**Key requirements (user, overrides original gold/e-commerce spec):**
- NO e-commerce / cart / checkout. NO prices shown → "Price on request" + Request-Price / Book-Viewing enquiry flow.
- Tiffany blue palette, real logo, **drippy** (liquid drip) animations.
- Real photos scraped to `public/brand/` (gr-01..12 = dripjewels_gr; vs Rolex set pending a download-allow click). Scrape method: in-page fetch → store-only ZIP → download (IG blocks URL extraction; scrolling freezes the renderer; one auto-download per site).

**LIVE on Vercel (2026-07-08):** https://drip-jewels-live.vercel.app — deployed a **static Next.js export** (the built `out/`, not the source project) from `Downloads/drip jewels 7-7.zip`. Deploy folder = `claude projects/drip-jewels-live` (static site, no package.json so Vercel serves it as-is, no build). Vercel account **webactionhellas-dev**, project `webactionhellascom/drip-jewels-live`, `.vercel/` link exists in the folder. Title served: "Drip Jewels · Luxury Watches, Diamonds & Jewellery · Glyfada, Athens". Local preview: launch config `drip-jewels-live` (nocache-server :4650).

**⚠️ enhance LAYER (drip-jewels-live only, NOT in the source):** the deploy folder has hand-written `enhance.js` (~35KB) + `enhance.css` (~10KB) loaded AFTER the `_next` bundles — they patch/add: hero video freeze, EN/ΕΛ language toggle (`.dj-lang`), per-section hover background photos (`addHoverBg`→`.dj-bg`), footer photo cycle, the "Signature Pieces" expanding selector (`.dj-opt`), and (2026-07-10) a **smoother cursor spotlight**. These are POST-export edits that do NOT exist in `claude projects/drip-jewels` source. **So the memory's old "rebuild source → replace drip-jewels-live" update path WOULD WIPE the enhance layer** — instead edit `drip-jewels-live` directly (enhance.js/css) and `vercel deploy --prod --yes` from that folder, OR re-apply enhance.js/css after any rebuild. enhance.js runs via `init()` on a rAF+rAF+setTimeout(250) boot; functions insert nodes as a section/card's `firstChild` (React keeps its own fibers, ignores the injected node — proven safe).

**2026-07-10 smoother cursor glow** (backup `enhance.js.spotbak`/`enhance.css.spotbak`): the appointment card (`#private-viewings`, `PrivateViewings.tsx`) and the newsletter/email card (`#journal` footer, `Footer.tsx`) each had a tiffany radial glow driven by React `useState` → `setSpot({x,y})` on every mousemove → re-render with `background:radial-gradient(300px|260px circle at Xpx Ypx, rgba(37,196,207,…))` — a 1:1, un-eased follow. New `enhance.js addSmoothSpot(card,buildBg)` hides the React overlay (`reactGlow.style.display='none'`; React only writes opacity/background, never display, so it sticks) and injects a `.dj-spot` div driven by a **rAF lerp (EASE 0.14)** so the light glides with a soft trail; `setupSmoothSpots()` wires both cards (appointment 300px @0.16α, newsletter 260px @0.22→0.06α). Verified selectors/injection/hiding/gradient/ease-math via inline eval + confirmed `.dj-spot` CSS applies; NOTE the harness preview tab is `document.hidden` so rAF is paused → `init()` and the easing don't run there (they run fine in a foreground browser).

**2026-07-10 product-card + collections tweaks** (backup `.glowbak`): (a) **stuck "View Piece" action buttons** — the ProductCard (`ProductCard.tsx`, `<article class="group">`) action overlay reveals on `group-hover` AND `group-focus-within`; a MOUSE click focuses the button, the detail/enquiry modal's `useFocusTrap` restores focus to it on close, so `group-focus-within` left the actions stuck-visible. Fix `preventCardFocusStick()` in enhance.js: capture-phase `mousedown` listener `e.preventDefault()` on any `article.group button` (kills mouse-focus without affecting the click or keyboard Tab focus) + a MutationObserver that blurs a lingering card-focused element when a `[role="dialog"]` is removed. (b) **tiffany ambient side-glows** in the "Signature Collections" (`#collections`, `Collections.tsx`, content in `max-w-7xl`) left/right margins — `addSideGlows("collections")` injects two `.dj-side-glow` divs; CSS `#collections > .dj-side-glow` (id-scoped to beat the `.dj-bg-host > *{z-index:1}` rule) is `position:absolute; z-index:0; mix-blend-mode:screen` with a tiffany radial hugging each edge, gated `@media(min-width:1280px)` (only where real margins exist). Sits behind the z-1 cards (masked by them) and above the dark `.dj-bg` photo. Verified CSS applies + mousedown-preventDefault stops focus-stick via inline eval.
