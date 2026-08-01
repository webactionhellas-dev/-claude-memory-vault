---
name: drip-jewels-hero
description: "drip-jewels hero saga (July 2026, IN PROGRESS): replacing the hero <video> with a high-quality animated WebP identical to the original video to beat the iOS Low Power Mode play button; the scroll lag was the header backdrop-filter blur(24px); lists the dead ends + hard constraints"
metadata: 
  node_type: memory
  type: project
  originSessionId: da1e13c2-4a11-4036-a5fc-90672d7e90b4
---

drip-jewels-live (Glyfada jewellery/watches; static Next export, "patch the built artifacts" site; Vercel project drip-jewels-live, team webactionhellascom; deploy folder `C:\Users\mikef\Downloads\drip-jewels-live-herofix`; current prod `dpl_3hh2tAGaTWfaxERmuV4UVP6m1pWm` = untouched "hero3" version). Hero = a diamond-snake clip that plays ~2s then FREEZES on its final frame (CAP=2).

**The two real problems (both iOS-specific):**
1. Hero scroll lag = a fixed header with `backdrop-filter: blur(24px)` (+31 `blur(8px)` product cards) re-blurring the page every scroll frame. Media-independent — that's why it survived the plain video, the canvas, AND the WebP. Fix applied: hero-scoped de-blur `html.dj-hero-active header{backdrop-filter:none}` via IntersectionObserver on `#top` (card blurs left alone; whole-page smoothness is a SEPARATE pending decision — lifting the card/header blurs changes the frosted-glass look).
2. Under iOS Low Power Mode a native `<video>` cannot autoplay — iOS forces a play button and the scroll "fights to start." No code removes it (the drip-store hero has the same limit). Only an animated IMAGE plays under LPM with no button.

**DECISION (Mike chose, 2026-07-21): replace the hero `<video>` with a HIGH-QUALITY animated WebP** built from the ORIGINAL video, identical look, 30fps, matching the exact ~2.0s snake motion + freeze frame, hold last frame. Plays under battery saver with no button + smooth scroll. Mike accepts a slightly heavier/slower load in exchange for identical quality; add an instant poster (first frame) so it is never blank while the WebP downloads.

**HARD constraints:** NEVER alter the original video — `hero.mp4` = 5,926,292 bytes, md5 `24d1d32051d80fe648e1b11ad7b4ff56` (Mike got angry when a re-encode shortened it / made the snake "freeze very early"). The animated version's freeze frame MUST match current live's ~2.0s frame. ONLY the hero changes; everything else byte-identical. Deploy gated on Mike's explicit go; preview links first (Vercel Deployment Protection is ON — mint a public share link via the `get_access_to_vercel_url` MCP tool).

**DEAD ENDS — do not repeat:** JSMpeg canvas fallback (decoded 0 frames on real iOS), 12fps WebP (choppy, "I can see the frames"), re-encoding the video (shortened it), still-image swap machinery (glitchy), and trying to make a native `<video>` autoplay under LPM (impossible). See [[hero-video-lpm-canvas-fallback]] and [[css-fixed-backdrop-filter-trap]].

**NEXT (stopped mid-build for the night):** finish the animated-WebP hero. Corky confirmed the `<video>` sits in the static body HTML (safe to edit directly — NOT in the RSC flight payload, so [[nextjs-flight-length-prefix-trap]] does not apply); plan was to drop the 5.9MB eager video fetch, drop in the instant poster + the WebP, keep the header de-blur, deploy a preview, Mike compares it against his real video on his iPhone.

Sibling win: the drip-store (sneaker) marquee black-drop/blink/left-edge-snap is FIXED and LIVE on drip-store-orpin.vercel.app (root cause: a CSS `mask` over the animated track made iOS drop the whole layer, + 2 oversized logos evicting from memory; fix: mask→gradient-overlay edge fades, GPU-stabilized track, Stussy 1024px→190px + a small Drip-Exclusive variant, wide `clamp(84px,13vw,150px)` fade; rollback `dpl_6cPoatMmyHY8`). See [[drip-astro-v2-site]].
