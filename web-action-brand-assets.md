---
name: web-action-brand-assets
description: "Where Web Action's real logo files live and what the agency's actual brand palette is (near-black + electric cyan/blue neon), plus the trap of an agent declaring the logo does not exist"
metadata: 
  node_type: memory
  type: project
  originSessionId: 490937b7-f28e-48dc-959e-86f3ca95b6dd
  modified: 2026-08-07T01:44:29.100Z
---

**On the ASTER machine (2026-08-07): the paths below are `mikef` and do NOT exist here.** The reliable source on aster is the live site itself: `webactionhellas.com` is a single ~2.1MB document with every asset inlined as a base64 data URI, so `curl` the page and decode them. Doing that yields the real lockup at **1103x524 with genuine alpha, the blue neon halo, and the electric-blue A of ACTION** — extracted and saved to `C:\Users\aster\site-monitor\public\brand\wa-lockup-hi.webp`.

**Trap found doing this:** the `wa-mark.webp` bundled in site-monitor (959x325) is a crop of that lockup with the halo stripped and the wordmark removed. It looks like the logo and is not — it renders soft and off-brand. Prefer the extracted lockup for any surface bigger than a toolbar.

**Web Action (W&A) has a full real logo set on Mike's machine. Never build a Web Action surface with a typographic placeholder wordmark, and never claim no logo exists without checking these two places first.**

- `C:\Users\mikef\webaction-hub\web-action-logo\` - SVG set: `logo-mark.svg`, `logo-lockup.svg`, `logo-lockup-reversed.svg`, `emblem.svg`, `emblem-lockup.svg`, `favicon.svg`, `emblem-favicon.svg`, `v2-arrow-mark.svg`, `v2-lockup.svg`, `logo-mark-tile.svg`, plus `index.html`/`emblem.html` previews. Scalable, offline-safe, right choice for a desktop app or any high-DPI surface.
- `C:\Users\mikef\Downloads\` - raster: `wa-logo-transparent.png`, `wa-logo-onblack.png`, `WA.PNG`, `newlogowebaction.logo.jpg`, `webaction logo.PNG`, `WebAction_BusinessCard_clean.png`, `CARD - BACK SIDE FINAL WA.png`, `webaction-favicon-update.zip`.

**The mark Mike actually uses in the wild** (business cards) is a glossy chrome **WA** monogram over a dark starfield, with a `WEB ACTION` wordmark beneath in which the **A of ACTION is a solid electric-blue triangle**, and the tagline `WEB & APP DEVELOPMENT`. The `web-action-logo` SVGs are a cleaner separate exploration set (cyan-gradient rising-W-into-arrowhead, 3-chevron arrow, navy circular W&A emblem) and are not the same mark. Prefer what Mike really uses over a generated exploration unless he says otherwise.

**Trap:** `wa-logo-transparent.png` is named "transparent" but carries a baked dark starfield background. Verify real alpha with `imgtools.py` and READ the `_CHECK.png` over a non-black surface before wiring any raster (see [[crisp-transparent-assets]]).

**The real agency palette is DARK plus electric cyan/blue neon, not light.** Harvested from `C:\Users\mikef\web-action-site\src` (the real marketing site) and the logo SVGs:
- Base near-black: `#0b0e16`, `#0d1018`; page `--background` is pure black; structural greys `#3a4254`, `#262626`
- Electric blues: `#3366FF` (primary), `#4d7bff`, `#5B8CFF`, `#70B5FF`, `#8FB6FF`, `#cdd9ff`
- Logo gradient: `#22D3EE` cyan to `#38BDF8` to `#4F7BFF`
- Emblem navy: `#16264f` to `#0A1330`

**How this went wrong once (2026-08-03, site-monitor build):** Nami wrote "No real Web Action logo exists anywhere on file" without searching `Downloads` or `webaction-hub`, and pulled the accent blue from webactionhellas.com while putting it on a white `#FAFAFA` paper field. Mike rejected the whole build: "It doesn't have my logo of my company, the WA. It's not the colors of my agency, you know, the black, neons, and shit. It's not tech." Two full build rounds were lost. Search the disk for brand assets before ever concluding they do not exist.

**Live tension to design around:** Mike cannot distinguish dark and near-black tones on his LG monitor (see [[mike-dark-tone-visibility]]), yet his brand is near-black. His resolution, given directly: go dark, but nothing may be encoded in the dark range. No dark-grey-on-black surface steps, no low-alpha hairlines carrying structure, no dark-on-dark elevation. Surfaces separate by luminous edge, glow, saturated border or a clear luminance jump, and the neon does the work.

See [[web-action-site-build]] for the marketing site itself, [[site-monitor-task-board]] for the internal tool this surfaced on.
