---
name: web-action-site-mobile-perf
description: Mobile scroll-jank fixes applied to the Web Action site hero + process steps
metadata: 
  node_type: memory
  type: project
  originSessionId: 0f6e4d0d-b30e-47a0-87a3-d0c5d3e24c5a
---

The Web Action site ([[web-action-site-build]]) had mobile scroll-stutter. The expensive repaints that were throttled (all in `src/`):

- **`.wa-fog`** (3 × `blur(60px)` radial gradients animating forever) — `display:none` under `@media (max-width:768px)` in `index.css`. Biggest win.
- **Process step device glow** — the 5-layer `drop-shadow` was inline on the `<img>`; moved to a `.device-outline` CSS class so mobile can drop to a single cheap shadow (it repaints every frame while the image floats/scroll-scales).
- **Hero earth dissolve** — `CosmicHero.tsx` rewrote the Earth's `mask-image` gradient on every scroll frame (re-rasterizing the full-height planet). Now gated behind a `lightScroll` ref (`max-width:768px` or `pointer:coarse`); on mobile it relies on the cheap compositor opacity fade instead.
- `viewport-fit=cover` added to the viewport meta; `overscroll-behavior-y:none` on body.

**Why:** continuously-animated blur/drop-shadow/mask invalidations are the classic mobile-jank sources; keep them desktop-only.
**How to apply:** when adding hero/section effects, guard heavy filters/masks behind a `max-width:768px` / `pointer:coarse` check rather than running them everywhere.
