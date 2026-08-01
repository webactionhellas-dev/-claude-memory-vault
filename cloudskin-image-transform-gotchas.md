---
name: cloudskin-image-transform-gotchas
description: "Supabase Storage Image Transformation gotchas on CloudSkin's project, and the hard constraint that the on-canvas editor (/creator) imposes on any product-image optimization technique"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-01T18:10:23.478Z
  originSessionId: 70f1bde9-a5a3-4cb5-ac72-971762bb76e7
---

Discovered/verified 2026-08-01 while fixing slow + distorted product photos on cloudskin.com (see [[cloudskin-studio-live-and-pending]] LATEST-11 for the fix that shipped). Applies to any future work touching product images on this site.

**`resize=cover` without an explicit `height` distorts the image, it does not crop it.** Supabase's `/storage/v1/render/image/public/...` transform endpoint needs both width AND height to know what box to crop-to-fill. Request only `width` with `resize=cover` and it ships the image at the FULL original height with just the width narrowed — a badly stretched, zoomed-looking photo. Confirmed live: `?width=800&resize=cover` on a 1920x2560 source returned 800x2560 (distorted); `?width=800&resize=contain` on the same source correctly returned 800x1067 (proportional, no crop) — and smaller bytes too. **Always use `resize=contain` when only requesting a width.**

**First request for any given width/quality combo is a COLD render, ~5-10x slower than cached.** Measured live: 1.13s cold vs 0.14s warm for the same URL requested twice. This is per exact query-string combination, so a brand-new width you start requesting (e.g. adding a new `MAIN_IMG_W` size) is cold for every photo until something actually requests it once. **Any new transform size needs to be idle-preloaded (detached `Image()` objects, `requestIdleCallback`) right after the relevant page paints, or the first real user to trigger it eats the cold-render delay.**

**The org's Supabase billing plan reports "free" via the Management API, yet Image Transformations work and are billable-per-Supabase's-own-docs only from Pro up.** It works today (verified repeatedly), but whether that's a stale plan label or something that could start being throttled/billed once usage is noticed is unconfirmed — worth a look in the actual Supabase dashboard billing page, not just the API, if this ever becomes a cost concern.

**Hard constraint: the on-canvas editor (`js/edit-mode.js`, live at cloudskin.com/creator) reads a photo `<img>`'s live `.src` / `getAttribute("src")` straight back as the value it persists to Supabase** — for gallery reorder (`persistGallery`), for "make this the main photo" (`commitGallery`), and as the key into its per-photo pan/zoom focal-point map. This means `.src` on any `<img>` the editor touches (PDP gallery thumbs, PDP main photo, product cards) MUST stay byte-identical to the raw Studio-uploaded Storage URL, forever — never rewrite it to a transformed/resized URL, or the editor will silently persist the wrong (tiny, transformed) URL as if it were the real photo, or drop a saved focal-point edit.

The safe pattern (already proven in production): apply the transformed, right-sized URL via the `srcset` attribute only, leaving `src` untouched. Browsers resolve `.currentSrc` (what actually downloads/paints) independently of `.src`/`getAttribute("src")` (what the editor reads), so this gets the real byte savings with zero risk to the editor. The editor itself already manages `srcset` defensively on its own writes (`img.removeAttribute("srcset")` right after setting a fresh `.src`), so this contract was already half-established in the codebase before this session extended it to the PDP main hero image.

See [[live-site-editor-product]] for the editor itself, [[cloudskin-deploy-setup]] for how to find the current canonical folder.
