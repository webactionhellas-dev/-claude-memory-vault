---
name: text-readability-no-collisions
description: "Mike's hard rule — text is always readable and perfectly sized/rendered; nothing overlaps, collides, clips, or overflows, especially on mobile"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1a0debd0-7bdf-45ac-b42d-966c016d9330
---

Every piece of text must be readable and rendered perfectly at every breakpoint — correctly sized, spaced, and wrapped — and must **never overlap or collide** with other text or elements, never be clipped/cut off, never overflow its container. Mobile is where it breaks most.

**Why:** Mike reported text colliding/overlapping on mobile. He wants the fleet to guarantee "nothing collides" as a permanent quality bar, not a per-site afterthought. Colliding or cut-off text instantly reads as broken and undercuts the world-class bar.

**How to apply:** design and verify at the narrowest widths (320 / 360 / 390) as well as tablet + desktop. This is now MECHANIZED in `design_audit.mjs` (mobile pass): it flags text-on-text overlap and text clipped by overflow with no ellipsis, swept across 390/360/320. Currently **WARN-level** (verified true-positive on a broken page + true-negative on a live site, 2026-07-11); promote to FAIL once calibrated across more real builds. Use fluid `clamp()` type, adequate line-height, a sensible min body size (~14-16px), and allow wrapping — no fixed heights that truncate. **Test long Greek strings**: Greek runs longer than English and is a frequent overflow/collision trigger. Nami, Corky, and site-qa all run `design_audit.mjs`, so this propagates automatically. A house quality invariant alongside [[crisp-transparent-assets]] and [[business-relevance-first]].
