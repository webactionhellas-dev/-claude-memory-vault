---
name: electro-stripe-effect
description: "DEPRECATED 2026-07-11 — Mike rejected the electro-stripe effect (baked black background = not truly transparent, and low resolution). Recipe kept only as a cautionary reference; do NOT reuse as-is."
metadata: 
  node_type: memory
  type: reference
  originSessionId: 67eaeddd-0ee3-481f-8509-123812466636
---

**REJECTED 2026-07-11 — do not reuse as the house effect.** Mike lifted his monitor gamma so he can now see dark tones (see [[mike-dark-tone-visibility]]), and the flaws became visible: the bolt sprites are NOT genuinely transparent — they are `mix-blend-mode:screen` crops off a purchased PNG sheet, which only *fakes* transparency by hiding black against a near-black page. On a lifted display the **baked black background shows**. The sprite art is also **low-resolution**. Mike wants better: any future lightning/energy effect must ship with a REAL alpha channel (no baked/black background, verified over checker + white + black), be high-resolution/crisp, and ideally be procedural (canvas/WebGL/SVG shader) rather than a low-res raster sheet. General standard: [[crisp-transparent-assets]]. The recipe below is retained only so the mistake is not repeated. Canonical (deprecated) source: `C:\Users\mikef\unicorn-tattoo` — `src/components/ui/ElectroStrike.tsx`, `src/components/ui/ZeusLightning.tsx`, the `zeus*` keyframes in `src/app/globals.css`, assets in `public/images/fx/`, generator `scripts/gen_fx2.py`.

WHAT IT IS: teal-white electric lightning bolts that strike DIAGONALLY (or vertically) behind/around a hero image, on a dark editorial page. One strike on the element's reveal; two stripes crackle in, the SECOND one FREEZES and stays lit behind the image. Retinted to whatever the site's accent is.

ASSETS (real sprite art, not procedural):
- Bolt art is EXTRACTED from a purchased "Electro Strike UI component" PNG sheet (Mike has it in Downloads; a montage of glowing blue bolts on near-black panels). Crop panels by fractional bbox + bright-content trim, BLACK-LEVEL each crop (per-channel subtract the panel bg = median of darkest ~55% of pixels, rescale) and FADE the crop edges, else screen-blend shows faint rectangles. Save as WebP q88. See `scripts/gen_fx2.py`. Result: `public/images/fx/strike-v1.webp` (hi-res main bolt, from "DEFAULT" rotated 90°), `strike-v2.webp` (thinner "VERTICAL"), `strike-h.webp` (the "GLOW INTENSE" crackle band).
- `ElectroStrike.tsx`: `<img>` with `mix-blend-mode:screen`, `pointer-events-none select-none max-w-none`, a `STRIKE_SRC` map {horizontal,vertical,vertical-alt}. Reusable divider/accent too.

COMPOSITING (per strike, all keyed on a strike counter so they replay):
1. Backlight: a screen-blend teal radial `<div>` behind the image (rgba(70,183,206,..) core -> rgba(46,150,176,..) -> transparent).
2. Bolts: 2x `<ElectroStrike>` rotated to the diagonal (`transform: translate(-50%,-50%) rotate(38deg)` and `rotate(42deg) scaleX(-1)`; height ~130%, centered) with `filter:'hue-rotate(-16deg) saturate(0.92)'` to pull the sprite's blue halo toward the brand accent while the white-hot core stays white. (Retint hue-rotate amount to match the site accent.)
3. Storm layer sits BEHIND the photo: photo box gets `relative z-[1]`, the storm `absolute -inset-[..] z-0 overflow-hidden`. To keep it off a caption below, use `bottom-0` instead of a symmetric negative inset.

KEYFRAMES (globals.css): `zeusFlash` (backlight fade), `zeusStroke1` (fast crackle: strike/dip/2nd-strike/decay, `forwards` ends at 0), and the FREEZE = `zeusFreeze` (0->1 strike, flicker, settle to ~0.55, `forwards` HOLDS 0.55 forever so the 2nd stripe stays lit). Slow the whole thing by bumping the animation durations (~1.5s bolts / ~1.9s freeze felt right).

TRIGGER RECIPE (the important part):
- Single fire on `IntersectionObserver` (threshold 0.05 + `rootMargin '0px 0px -12% 0px'` to match the site's Reveal trigger point), a `fired` flag + `io.disconnect()` so it fires ONCE, `setTimeout(..., ~900ms)` so it lands in sync with the element's reveal. No ambient repeat (Mike disliked the metronome; ambient every 5-8s is available but off by default).
- CRITICAL: keep the storm OUTSIDE the container's opacity-reveal fade (as a sibling behind the image, z-0), or the strike gets multiplied by the fade and the first stripe is invisible. Decoupling it = both stripes fully visible and it can appear TOGETHER with the image.
- Gate: `if (prefers-reduced-motion) return;` (no strikes). Don't gate the single lock-strike on document.hidden.

GOTCHAS: accent may be a mislabeled token (Unicorn's "violet" is teal #2E96B0 — see [[unicorn-tattoo-accent-teal]]); the white-hot bolt CORE must stay white (only the halo/glow carries the accent, or it looks like a gas leak). Relates to [[unicorn-tattoo-site]], [[nami-design-standards]] (advanced motion catalog).
