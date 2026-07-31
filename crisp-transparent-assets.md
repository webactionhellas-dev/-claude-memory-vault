---
name: crisp-transparent-assets
description: "Mike's quality bar — every logo, cutout and effect must be genuinely transparent (real alpha, no baked/black background) AND high-resolution/crisp; never fake transparency with a blend mode"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1a0debd0-7bdf-45ac-b42d-966c016d9330
---

Every logo, image cutout, sprite and visual effect ships with a **real alpha channel (zero background, no halo)** and at **high resolution / crisp** detail. Two hard requirements, both non-negotiable:
1. **Genuinely transparent** — actual transparency, not a blend-mode trick over a baked background. `mix-blend-mode:screen`/`multiply` that hides black against a dark page is NOT transparency; it breaks the moment the background or the viewer's display changes.
2. **High-resolution / crisp** — no soft, pixelated, or low-res assets. Logos and hero art must be sharp at 2x.

**Why:** Mike rejected the electro-stripe lightning effect (see [[electro-stripe-effect]]) after lifting his monitor gamma (see [[mike-dark-tone-visibility]]): the bolts had a baked black background that his crushed blacks had been hiding, and the sprite art was low-res. He explicitly wants "very crisp logos without background" as a permanent standard and Nami's craft to keep improving toward it. Fake or low-res assets read as amateur and undercut the world-class bar.

**How to apply:** cut out logos/images with `imgtools.py` and READ the `_CHECK.png` composite over checker + white + black + brand before wiring — confirm no halo, no fringe, no baked rectangle. Prefer procedural effects (canvas/WebGL/SVG/GLSL shader) or genuine PNG/WebP alpha over raster sprite sheets. If a source asset is low-res, upscale/regenerate or source a better one; do not ship it soft. This is a house invariant tied to [[business-relevance-first]] and the quality gate; Nami holds the line and Corky/site-qa can catch baked backgrounds by checking the effect over a non-black surface.
