---
name: grk-design-language
description: "GRK site design language — sodium-vapor palette, Tektur type, and the scroll-driven \"slip angle\" signature; includes hard-won technical constraints"
metadata: 
  node_type: memory
  type: project
  originSessionId: 88149d92-42c9-455e-94ef-39ff47ee2ad8
---

Design language for the [[grk-racing-site]], with the constraints that were discovered the hard way.

**Palette — deliberately NOT black-and-cyan** (the default for every car/tech site). Drawn from where GRK actually shoots: Greek streets at night.
- Asphalt `#08080a` / `#101014` / `#1a1a20` / `#2b2b34`
- **Sodium vapor** (streetlamp, primary accent) `#ff9e3d`, hot `#ffb25c`, deep `#c96a12`
- **Greek flag ultramarine** (counter) `#0d5eaf`, lit `#1e7fe0`
- **Tire smoke** (warm white, never pure #fff) `#e8e6e1`, dim `#96938c`

**Type:** display = **Tektur** (squared/technical, has a real `greek` subset so the Greek identity lives in the type). Body = Manrope, telemetry = JetBrains Mono — both also have `greek` subsets, so the site can go bilingual EN/EL later.
- **Anek Greek does not exist** in Next 16's bundled `font-data.json`. Check `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json` before picking a Google font.
- **Tektur's `wdth` axis is 75–100** — 100 is its widest cut. Never request `font-stretch` above 100%; the wide stance is the default.

**The signature — the page drifts.** Scroll velocity feeds a slip angle; the layout counter-steers and settles back to 0° like a car being caught. `DriftScroll.tsx` publishes `--slip` / `--slip-mag` on `:root` and mirrors them into a non-React module store (`lib/drift.ts`) so the HUD can update at 60fps without re-rendering.
- **Real drift angles are 40–70°**, not 7. `--slip` carries a genuine angle (MAX_SLIP 52) so the HUD reads authentically.
- **Skew must be decoupled from that angle**: `.drift` uses `calc(var(--slip) * -0.05)` → peaks ~2° / ~29px edge travel. Applying 52° literally tears the layout apart; 0.22 of 7° was invisible (2px). This ratio was tuned by measurement.
- Measured: a normal wheel scroll peaks at Lenis velocity ~28–30, so `VELOCITY_AT_FULL_LOCK = 32`.
- Whole thing is disabled under `prefers-reduced-motion`.

**Stacking gotcha:** negative z-index (`-z-10`/`-z-20`) on hero background layers paints them *behind the body background* and they vanish. Use `isolate` on the section with positive z-layers instead.

**Also:** `devIndicators: false` in `next.config.ts` — Next's dev badge sits bottom-left, exactly where the slip HUD lives.
