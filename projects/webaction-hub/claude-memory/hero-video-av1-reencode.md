---
name: hero-video-av1-reencode
description: "Recipe + tooling for cutting heavy autoplay hero videos with AV1 (found via new perf_probe.mjs); drip-store hero done locally, pending deploy"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4bc079d7-c87e-48c0-8d5c-f2ba92a4efc5
  modified: 2026-07-30T18:18:58.942Z
---

A real-browser perf sweep (2026-07-30) of Mike's live sites found the drip-store storefront (`drip-store-orpin.vercel.app`, canonical folder `C:\Users\mikef\drip-astro-test`) loading **10.1 MB with a 5.97s mobile FCP** — 87.5% of it a single 9MB autoplay hero video (`public/hero/hero-bg.mp4`, filmed at 4K/3840x2160). By contrast drip-barbershop loads in 760ms / 1.2MB.

**The tool that found it:** `perf_probe.mjs` (new, in `website-builder/scripts/visual/`, sibling to visual_check/design_audit). Real mobile-browser Navigation Timing + top-10 largest responses by byte. `perf_audit.py` only checks static file weight; nothing measured real runtime load before this, which is how a 9MB hero shipped unnoticed. Now indexed in [[house-playbook]] gate tooling.

**The fix (reusable recipe, ffmpeg SVT-AV1):** a filmed 4K hero is cinema-master overkill for a muted background-behind-text loop. This footage is unusually high-motion so it barely compressed at 1080p H.264 (8.8MB) — the win was the AV1 CODEC, not fewer pixels. Full spread at genuine 1080p: H.264 CRF22 8.8MB, AV1 CRF34 5.4MB, **AV1 CRF40 3.6MB**. Mike compared all four full-screen on his own monitor via a local `compare.html` and could not tell them apart (the dark hero scrim hides any residual artifact), chose the 3.6MB. Encode: `ffmpeg -i src -vf scale=1920:1080 -c:v libsvtav1 -preset 5 -crf 40 -an -movflags +faststart out.mp4`. ffmpeg is at `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\...\bin\ffmpeg`.

**Wired into `Hero.astro` locally** as dual `<source>`: AV1 `type="video/mp4; codecs=av01.0.08M.08"` first, 1080p H.264 CRF28 (4.8MB) fallback second, so modern browsers (Chrome/Edge/Firefox/Safari17+) pull 3.6MB and old ones still beat today's 8.9MB. Verified in-browser that `video.currentSrc` resolves to the AV1 at 1920x1080 readyState 4. Original 4K preserved as `public/hero/hero-bg.4k-original.mp4` (never deleted). Quality gate PASS.

**Why:** Mike asked for a big site-speed win; this is 8.9MB -> 3.6MB (~60%) on every homepage load of a live storefront, zero visible quality loss he could detect.
**How to apply:** STATUS = done locally, **NOT deployed** (house deploy gate). To ship: `cd C:\Users\mikef\drip-astro-test`, build, deploy via the gated flow, only on Mike's explicit go. Same recipe applies to the paused [[drip-jewels-hero]] work and any future heavy hero. Related: [[hero-video-lpm-canvas-fallback]] (the iOS Low Power Mode autoplay block is a separate concern from weight).
