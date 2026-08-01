---
name: css-fixed-backdrop-filter-trap
description: "A backdrop-filter/filter/transform ancestor traps position:fixed children to that ancestor's box"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 7ff659ca-fb0e-466e-be2a-88304fe77fb8
---

Gotcha that recurs in sticky-nav site builds: if an ancestor has `backdrop-filter`, `filter`, `transform`, `perspective`, `will-change`, or `contain`, then a descendant with `position: fixed` is positioned relative to **that ancestor**, not the viewport.

**Symptom seen on [[greencleaners-site]]:** the mobile full-screen menu lived inside the `<header>`. When unscrolled it worked; once scrolled the header gained `glass-nav` (backdrop-filter blur), which trapped the `fixed inset-0` menu to the ~60px header box → menu appeared see-through / only covered the top strip.

**Fix:** render full-screen `fixed` overlays/menus/modals OUTSIDE any backdrop-filtered/transformed ancestor (sibling of the header, or a portal). Also lock body scroll while open and give the overlay a high z-index above the global grain layer.

**How to apply:** when building a frosted/blurred sticky navbar with a fixed mobile menu or modal, keep the overlay out of the blurred header subtree from the start.
