---
name: cloudskin-creator-key-contract
description: "The CloudSkin Creator and the shopper-facing applier must write/read the exact same override keys, per field"
metadata: 
  node_type: memory
  type: reference
  originSessionId: fcd19b5d-d792-44f0-bbb5-5aed4e24130b
  modified: 2026-07-25T20:28:25.717Z
---

CloudSkin has TWO editors writing owner overrides into Supabase `cloudskin_content`, plus one shopper-facing applier that must read whatever they wrote:
- **Studio** (studio.html) writes structured keys: `product.<h>.desc/.features (whole list)/.fabric/.fit.type/.fit.copy`, shared `pdp.care/pdp.fit.trailing`.
- **Creator/Vellum** (js/edit-mode.js `tagPDP()`) is on-canvas; it tags PDP DOM at runtime and writes per-element keys: desc, per-bullet `.features.<i>`, whole-panel `.acc.0` (Fabric&Care) / `.acc.1` (Fit), shared `pdp.shipline/pdp.shipping`.
- **Applier** shoppers see = js/product.js `applyOverrides()`.

**The trap (fixed 2026-07-25):** the Creator wrote keys `applyOverrides()` did not read, so edits looked saved in the editor but reverted for shoppers (phantom edits). Fix reconciled per field: title dropped from editing (Shopify owns checkout title); dead `.buybox__style` tag removed; applyOverrides now reads per-bullet `.features.<i>` overlaid on the base list, and whole-panel `.acc.0`/`.acc.1` take precedence over the structured fabric/fit rebuild (Studio path kept as fallback); section headings (`pdp.completeLook.title`/`pdp.details.title`) dropped from editing (i18n-managed, would leak one language across all 11). Also: the accordion "shipping" panel is now tagged by INDEX (i===2), not an EN/GR-only label regex, so it maps to `pdp.shipping` in every language — matching applyOverrides' index-based panel reads.

**Rule:** any on-canvas editor that reuses a public applier must write the EXACT keys that applier reads. A granularity mismatch (per-item edit key vs whole-list read key) is the classic phantom-edit bug. Verify each field on the PUBLIC (unarmed) page, not just in the editor. Test method: [[cloudskin-creator-safe-test]].
