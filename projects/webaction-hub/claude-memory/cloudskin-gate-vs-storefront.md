---
name: cloudskin-gate-vs-storefront
description: CloudSkin has TWO homepages — a gate (index.html at /) and the real storefront (home.html at /home); mixing them up causes an infinite redirect loop that freezes the renderer
metadata: 
  node_type: memory
  type: reference
  originSessionId: 75ea6c2d-9aa2-4169-ad82-275f54c1b095
---

The live CloudSkin site serves a "Launching Soon" GATE at `/` from **index.html** (~367KB; has the email-capture, the Facebook/Instagram/TikTok social row, and a password form). Unlocking sets `sessionStorage.cs_gate_ok='1'` then `location.replace('/home')`. The REAL storefront homepage is **home.html** (~14KB JS shell, title "Luxury Activewear") served at `/home`, and it does the reverse: `if(!cs_gate_ok) location.replace('/')`.

TRAP (cost real time 2026-07-17): `curl https://www.cloudskin.com/` returns the GATE (index.html), NOT the storefront — do not save/label it `home.html`. If the gate page ends up served at `/home` (e.g. a mislabeled mirror), unlocking makes `/home` redirect to `/home` → **infinite redirect loop → renderer freeze** ("coming soon page crashes after login"). Fix: gate content belongs at `/index.html`, real storefront at `/home`.

Facebook lived in TWO places: the gate's hardcoded social row (index.html) AND the shared footer via `CLOUDSKIN.footer.socials` in js/config.js; the storefront /home has no hardcoded Facebook (it renders the config.js footer). Remove from both.

TWO cloud SVGs exist and it matters for the favicon: the CORRECTED cloud is the gate hero (`<svg class="cloud">`, path starts `M48.493 39.950`, cream stroke, viewBox 0 0 64 46); an OLD/wrong cloud (path `M47.051 43.954`, viewBox 64x64) was still used by the favicon (img/brand/favicon.svg + the inline data-URI icon) and the header brand logo. When (re)building the favicon, use the CORRECTED `M48.493` cloud, not the old one. A proper favicon needs a real `/favicon.ico` at web root (the site only shipped an SVG/data-URI icon, so `/favicon.ico` 404'd); build favicon.ico (16/32/48) + apple-touch-icon (the old apple-touch wrongly pointed at og-image.jpg). Rasterize SVG with svglib+reportlab after `pip install pycairo rlPyCairo` (no cairo otherwise on this box).

Deploy: static site, direct CLI upload (NOT git), Vercel project `cloudskin` `prj_6d0gmXALxXTKZFj7AAVoBZfns12W`, team webaction/webactionhellascom. Method = mirror the live site + overlay changed files + `vercel deploy --prod`. Gate password `Cloudskin2026!`; studio password `CloudskinStudio1`. See [[cloudskin-site]] and [[cloudskin-studio-colours]].
