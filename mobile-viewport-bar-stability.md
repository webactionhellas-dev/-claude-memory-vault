---
name: mobile-viewport-bar-stability
description: "House standard for stopping the mobile browser-bar \"shake\" (Safari/Chrome/Instagram in-app) on every build; svh/lvh not dvh, kill touch backdrop-filter, guard resize handlers, JS pixel-lock escalation"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5519114f-2eb7-4881-9d19-56ac748fbce1
  modified: 2026-08-07T20:32:21.039Z
---

Mike's hard requirement (2026-07-21): every site must stay rock-steady when the mobile browser chrome (bottom bar) shows/hides on scroll, in Safari, Chrome, AND the Instagram/Facebook in-app browser (the strictest case). A layout that resizes/jumps/flickers as that bar animates is a defect. Now codified in `~/.claude/CLAUDE.md` under "Mobile viewport stability".

**Why:** Mike scrolls his live sites in the Instagram in-app browser on his phone; the bar toggling was "shaking the website." He wants it perfect everywhere, not just desktop or a single browser, and wants it baked into project rules so no future build reintroduces it.

**How to apply (four rules, every build):**
1. Full-height sections: never `100vh`/`100dvh` as the real height (`dvh` resizes continuously = the shake). Use `100svh` (never-resize) or `100lvh` (full-bleed hero, fills with no gap), always with a `100vh` fallback line first.
2. Fixed/sticky bars with `backdrop-filter: blur()`: kill the live blur on touch — `@media (hover:none){ .bar{ backdrop-filter:none; -webkit-backdrop-filter:none; background:<solid> } }`. A fixed live-blurred bar forces a full-page re-composite when the chrome animates (worst in in-app browsers). See [[css-fixed-backdrop-filter-trap]]. This was also the Drip Jewels scroll-lag fix ([[drip-jewels-hero]]).
3. Guard JS resize/scroll handlers: ignore height-only changes on touch — `if(w===lastW && Math.abs(h-lastH)<160 && matchMedia('(hover:none)').matches) return;`. Recompute canvas/layout only on real width/orientation change.
4. Escalation for WebViews that mis-handle svh: JS pixel-lock `--app-h = innerHeight`, recomputed only on width change; CSS `min-height: var(--app-h, 100svh)`.

**Status (all four DEPLOYED to production + verified live 2026-07-21; final proof = Mike testing in the Instagram in-app browser on his phone):**
- Trattoria Capanna ([[trattoria-capanna-site]]): hero `#top` was `100dvh` (shook everywhere) -> `100lvh` in css/03.css. LIVE (confirmed 100lvh served, 100dvh gone).
- Web Action ([[web-action-site-build]]): fixed header `backdrop-blur-md` on scroll had NO touch guard (Instagram-only shake) -> added `@media(hover:none)` blur-kill. LIVE on webactionhellas.com. DEPLOY METHOD (folder was NOT .vercel-linked): the live site is a single inlined index.html; I patched the CURRENT LIVE html (fetched via curl) with only the `@media(hover:none)` <style> rule + re-attached all 7 favicons (repo lacked 48/96/192, fetched from live) into `C:/Users/mikef/web-action-site/wa-deploy/`, `vercel link --project webaction-site --scope webactionhellascom`, then `vercel --prod`. Do NOT deploy a fresh repo rebuild - it drops the extra favicon links + head content that live has (repo index.html diverged from the live deploy). hero already svh; wrapper min-h-screen->svh done in source but inert.
- CloudSkin ([[cloudskin-site]]): welcome/discount modal box `max-height:90dvh` -> `90svh` in cloudskin-v55/css/main.css. LIVE on cloudskin.com (verified 90svh served, store pages byte-unchanged). Before deploying I verified cloudskin-v55 mirror == live byte-for-byte (main.css/index/home/config.js/shell.js/content.js/product.html all 0-diff via `curl -sL`, the store gate needs -L to follow the 308) so pushing the mirror was safe.
- Drip Barbershop ([[drip-barbershop-site]]): was already hardened (svh + smoke height-only-resize guard + `@media(hover:none)` backdrop-filter:none) yet still shook in IG -> applied rule 4 JS pixel-lock: 4 heights -> `var(--app-h,100svh)` + width-only `--app-h` setter script after `<body>` in drip-barbershop-vercel/index.html (LF file, not CRLF). LIVE (verified script + 4 var() served). The optimized single-file ancestor is stale, not touched.
- CloudSkin PDP (2026-08-07, reported by Mike, screen-recorded and sent to me directly): on mobile, loading a product page showed a visible dark "shade" band above the sticky Add to Bag button right as the browser's address bar collapsed — the recompositing artifact rule 2 exists to prevent (a fixed/sticky bar with a live `backdrop-filter` blur forces a full-page repaint while the chrome animates). Confirmed fixed per Mike, not independently re-traced to a file/line in this session — **this exact symptom (a shaded/blurred band appearing near a sticky mobile CTA bar exactly as the browser chrome shows/hides) is the pattern-match for rule 2**, worth recognizing on sight on any future PDP/sticky-CTA build even before checking the code.
