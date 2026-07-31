---
name: drip-store-orientation-flips
description: "How DRIP store keeps every product photo facing toe-LEFT on the cards, and why the auto-detect heuristic is unreliable"
metadata: 
  node_type: memory
  type: project
  originSessionId: b9f6598d-f5d5-4620-9163-c339114f0e9b
---

DRIP store (C:\Users\mikef\drip-astro-test) mirrors product card photos so the whole catalogue faces the same way. Canonical direction is **toe-LEFT**. Mechanism: `src/data/orientation-flips.json` = array of slugs to mirror; `src/lib/orientation.ts` `shouldFlip(slug)`; `ProductCard.astro` applies `-scale-x-100` on the `<a>` when flipped. Flip a slug **iff its native photo faces toe-RIGHT**.

The old generator `scripts/orient-all.mjs` uses a crude heel-height heuristic that misfires on slides, foam runners, and slippers — it wrongly flipped every yeezy-slide (natively toe-left) so they showed toe-RIGHT (the outliers Mike reported 2026-07-11), and missed the UGG tasman slippers + yeezy-slide-onyx-copy (natively toe-right). Do NOT trust that heuristic.

Correct approach (used to rebuild the list): classify each product's PRIMARY image (`images[0]` in products.json, files in `src/assets/products/`) by native toe direction with a vision model (2 votes + tie-break), flip only the toe-right ones, leave apparel/toys/pairs/straight-on shots unflipped. After the drip.store catalog re-syncs (headless Shopify), the flip list must be regenerated the same way. Verify by rendering an "as-on-site" montage (mirror the flipped ones) and confirming every shoe points left. Current correct list is 15 slugs. See [[drip-astro-v2-site]].
