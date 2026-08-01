---
name: visual-check-lazy-image-blank-trap
description: "visual_check.mjs fullPage screenshots blank lazy/optimized images even when they load fine — trust the broken-images signal, not the PNG"
metadata: 
  node_type: memory
  type: reference
  originSessionId: cb063ab5-e29d-4685-a91b-27edbc9fa94b
---

Playwright `fullPage` (beyond-viewport) capture in `~/.claude/skills/website-builder/scripts/visual/visual_check.mjs` renders `loading="lazy"` / Vercel-optimized (`/_vercel/image`) images as blank white boxes in the PNG **even though they load perfectly for real users**. Eager images (hero, logo) render; lazy ones (product cards, category tiles) blank. This produced a full "product images are broken in prod after the security patch" false alarm on drip-store (2026-07-09) — the images were always fine (optimizer returned 200 valid webp; a real headless browser decoded 70/70).

**Do not diagnose broken images from the screenshot.** I hardened the tool: it now flips lazy→eager + waits for decode, and prints a programmatic line `broken images: none (all decoded)` from `naturalWidth===0` — that text signal is authoritative and immune to the capture quirk. Blank cards in the PNG + `broken images: none` == images are fine, stop there. I could NOT make fullPage paint the lazy images (full-height-viewport capture fixes it but breaks `100vh`/vh-based hero layouts), so the PNG limitation stands; the text signal is the defense.

Before "widening CSP img-src to fix missing images": check first. `img-src 'self' data: https:` already allows every HTTPS host, so that class of fix is usually a no-op. Verify with a direct `curl` of the real image URL (expect 200 + image/webp) and a headless naturalWidth probe. Related: [[preview-screenshot-timeout]], [[house-playbook]].
