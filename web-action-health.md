---
name: web-action-health
description: "Web Action studio site (webactionhellas.com) health-check history -- 2026-08-03: loads clean, but a Greek H2 is invisible under reduced-motion, no security headers beyond HSTS, 2.1 MB single-document payload"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9fc6d367-b535-413d-9cc4-c6051e857c44
  modified: 2026-08-03T17:40:58.606Z
---

Health-check history for [[webactionhellas-vercel-migration]] (webactionhellas.com), the agency's own studio site. Read-only audits, no fixes applied here. Registry: [[live-sites-registry]].

Canonical source on this machine: `C:\Users\aster\obsidian-vault\projects\web-action-site` (build path per [[web-action-site-build]]: `vite build --outDir dist_new` then `node inline-build.mjs`). The copy at `C:\Users\aster\projects\web-action` is a sync snapshot holding a 6.5 MB `index.html` that does not match live, ignore it.

## Health check 2026-08-03

Loads clean: 200 OK, no redirect, ~1.0s. Zero console errors, zero failed requests, no broken images, no horizontal overflow on desktop (1440) or mobile (390). Jost renders correctly on Latin headings and Greek headings are present.

**BUG, content invisible under reduced-motion.** With `prefers-reduced-motion: reduce`, the H2 "Ένα ολοκληρωμένο studio για ό,τι ανεβάζε..." stays stuck at opacity 0. The scroll-reveal has no reduced-motion fallback, so a visitor with that OS setting on (common, and the default on some accessibility profiles) simply never sees that section heading. Fix by having the reveal's end state apply immediately inside a `@media (prefers-reduced-motion: reduce)` block. Note this same defect appears on [[drip-barbershop-health]] and [[trattoria-capanna-health]], so it is a house-wide reveal-primitive problem, not a one-off.

**Security headers, only HSTS is set.** Live response carries `Strict-Transport-Security: max-age=63072000` and nothing else. Missing: CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`. Both [[cloudskin-health]] and [[drip-store-health]] serve a full header set from `vercel.json`, so the fix is to copy that pattern across. This is the agency's own shop window, so it is worth being clean here.

**WCAG AA contrast, 4 elements fail:**
- `.h-10` and the `.mt-11` primary CTA: `#ffffff` on `#3374ff`, ratio 4.13:1 at 12px and 14px. Just under the 4.5:1 bar, darkening the blue slightly clears it.
- `p:nth-child(1)` and `.tracking-[0.2em]`: `#646464` on `#000000`, ratio 3.54:1 at 12px.

A further 7 elements sit over image/gradient and could not be auto-verified, check by eye.

**Tap targets:** 8 interactive elements under 24x24 CSS px on mobile (WCAG 2.5.8), including the nav links "Υπηρεσίες" (63x20), "Το Studio" (57x20), "Επικοινωνία" (77x20), the "Ξεκινήστε ένα έργο" CTA (199x20), and both `webactionhellas@gmail.com` / `@webactionhellas` links. Inline text links are exempt, but the nav and CTA are not.

**Perf, 2.1 MB in a single document.** Live homepage is 2,132 KB over only 2 requests, 2,082 KB of which is the inlined HTML itself (fonts add 51 KB). Load to network-idle ~1.6s. The inline-everything build wins on request count but means nothing renders until the whole 2 MB document arrives, which is roughly 3.3s on mid-tier mobile. Worth splitting the largest inlined images out to real lazy-loaded assets. Related prior work: [[web-action-site-mobile-perf]].

**Source-side security:** `npm audit` on `web-action-site` reports 3 high (brace-expansion, postcss, react-router) plus 1 moderate, all with fixes available. Build-time and client-router deps for a static export, so prod exploitability is low, but `react-router` is worth patching. `security_audit.py` also flags a raw-HTML injection site in the built bundle `dist_new\assets\index-BuvhK2hf.js`, and finds no `.env`/`.gitignore` rule, verify secret handling. No hard-coded secrets found.
