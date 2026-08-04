---
name: drip-store-health
description: "DRIP Store (drip-store-orpin.vercel.app) health-check history -- 2026-08-03: loads clean but product names overlap prices at 390px on the live grid, 6.9 MB homepage driven by a 4.9 MB video"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9fc6d367-b535-413d-9cc4-c6051e857c44
  modified: 2026-08-03T17:41:22.912Z
---

Health-check history for [[drip-orpin-live]] / [[drip-astro-v2-site]] (drip-store-orpin.vercel.app), the Astro 5 + Tailwind v4 + Supabase + Stripe sneaker storefront. Read-only audits, no fixes applied here. Registry: [[live-sites-registry]].

Canonical source on this machine: `C:\Users\aster\obsidian-vault\projects\drip-astro-test`. The copies at `C:\Users\aster\projects\drip-astro` and `drip-astro-v2` are sync snapshots, prefer the obsidian-vault one.

## Health check 2026-08-03

Loads clean: 200 OK, ~3.2s first byte on a cold hit. Zero console errors, zero failed requests, no broken images, no horizontal overflow on desktop or mobile. Archivo renders on Latin headings. Live security headers are complete (CSP, HSTS with preload, nosniff, `X-Frame-Options: SAMEORIGIN`, Referrer-Policy).

**BUG, text collides on mobile, 13 pairs at 390px.** On the product grid the product name overlaps its own price. Confirmed pairs include "Jordan 1 Retro High Virgil Abl" x "€900", "Jordan Jumpman Jack TR Travis " x "€400", "Nike Kobe 6 Protro ASG Hollywo" x "€320", "ASICS Gel-Kayano 14 White Fjor" x "€160", "Nike Mind 001 Slide Light Smok" x "€130", "Kobe 8 Protro Year of the Hors" x "€320", "Kobe 5 Protro Year of the Mamb" x "€450", "Supreme Stone Island Camp Cap " x "€180". This is the highest-priority item on this site: it is a live storefront and the collision lands exactly on the name/price pair a shopper needs to read. Cause is almost certainly long product titles not wrapping or truncating in the card, so the title box grows into the price row. Violates the house rule recorded in [[text-readability-no-collisions]].

**WCAG AA contrast, 8 elements fail.** All the same token: `#6e6e78` on `#101013`, ratio 3.76:1, at 10px and 12px. Affected: `.tracking-[0.3em]` labels, `.py-6 > p`, `span[data-en="All rights reserved."]`, the `a[href$="login"]` link, and two spans in the `.gap-4.items-center.flex` row. One muted-foreground token lift fixes all eight. A further 103 elements sit over image/gradient and could not be auto-verified, check by eye.

**Tap targets:** 26 interactive elements under 24x24 CSS px on mobile. The product title links are only 15px tall (for example "Jordan 5 Retro Wolf Grey (2026" at 194x15, "Nike Book 1 What The" at 132x15). These are the primary product-entry links on a storefront, so they should not be sub-minimum.

**Greek font subset, unverified.** `design_audit.mjs` warns Archivo may not render Greek headings (the GFS Didot trap, see [[house-playbook]]). Confirm the Greek subset is actually in the font request before shipping any Greek copy, otherwise Greek headings silently fall back.

**Perf, 6.9 MB homepage.** 6,880 KB over 66 requests, ~2.1s to network-idle. Breakdown: video 4,869 KB, images 1,661 KB, text 234 KB, fonts 100 KB. A 4.9 MB hero video on a mobile-first e-commerce homepage is the dominant cost by far, roughly 7.6s of transfer on mid-tier mobile before anything else competes. Worth a poster-image-first load with the video deferred, or a much smaller encode. Note [[hero-video-lpm-canvas-fallback]] and [[drip-jewels-hero]]: iOS Low Power Mode blocks autoplay anyway, so a heavy video buys nothing for those users.

**Source-side security:** `npm audit` on `drip-astro-test` reports 4 high (brace-expansion, postcss, sharp, svgo) plus 2 moderate, all with fixes available. These are build-time deps for a static-ish Astro build, so prod exploitability is low. `security_audit.py` also flags raw-HTML injection sites in `src\components\Footer.astro` and `src\components\Icon.astro` (the snapshot copy additionally flags `src\pages\product\[slug].astro`), confirm inputs are sanitized given product data comes from Supabase. No hard-coded secrets, `.env` is gitignored.
