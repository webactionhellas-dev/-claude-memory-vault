---
name: preview-screenshot-timeout
description: preview_screenshot reliably times out on this Windows 10 machine — verify pages via eval/inspect/snapshot instead
metadata: 
  node_type: memory
  type: project
  originSessionId: 02724e9d-0625-4be8-9b9b-75e33f02db9b
---

On this machine (Windows 10 Home, 10.0.19045), `preview_screenshot` times out after 30s on every attempt, even for a fresh 720px-tall page with animations, grain overlays, and backdrop-filters disabled. The page itself stays healthy (`preview_eval` responds, console clean). The hidden preview window's renderer also suppresses programmatic smooth scrolling, scroll events, and IntersectionObserver callbacks — `window.scrollTo({behavior:'smooth'})` never moves, and scroll listeners only fire via manually dispatched `new Event('scroll')`.

**Why:** burned ~5 retries rediscovering this during the Dionyssos hotel build (June 2026); see [[dionyssos-hotel-site]].
**How to apply:** skip `preview_screenshot` here; verify with `preview_eval` (layout/grid/image checks), `preview_inspect` (computed styles), and `preview_snapshot` (text/structure). Use `behavior:'instant'` for programmatic scrolls and dispatch scroll events manually when testing scroll-driven UI.

**Screenshot fix (2026-07-09):** the fleet now has a Playwright tool that works where `preview_screenshot` fails: `node C:\Users\mikef\.claude\skills\website-builder\scripts\visual\visual_check.mjs <url> --out <dir>` captures full-page desktop + mobile PNGs (Read them to actually see the design), plus console errors, failed requests, a horizontal-overflow flag, and an axe accessibility summary. First use needs `npm install && npx playwright install chromium` in that folder (chromium already installed 2026-07-09). Nami/Corky/site-qa use it to verify a build instead of working blind. It caught the drip-store blank-product-images regression on its first real run. See [[house-starters]].
