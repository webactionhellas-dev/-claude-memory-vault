---
name: cloudskin-creator-safe-test
description: "How to test/debug the CloudSkin Creator (Vellum) against live Supabase without corrupting Larissa's live content"
metadata: 
  node_type: memory
  type: reference
  originSessionId: fcd19b5d-d792-44f0-bbb5-5aed4e24130b
  modified: 2026-07-25T20:27:56.822Z
---

Recipe for exercising the on-canvas Creator (js/edit-mode.js) with ZERO live writes, used to verify the phantom-PDP-edit fix.

**Serve locally against live Supabase:** `node serve.mjs <port>` from `C:\Users\mikef\cloudskin-v56` (static server, reads live Supabase via anon key). Store is gated: set `sessionStorage.cs_gate_ok="1"` for shopper view; arm the editor by logging in at `/creator` (pw CloudskinStudio1) or set `vlm-armed="1"`+`vlm-pw`+`cs_gate_ok`.

**Save-interceptor (the key trick):** `sbClient()` re-reads `window.CLOUDSKIN_SB_CLIENT` at call time (designed stub point). Wrap its `.rpc` so `studio_save` is captured not sent, and wrap `window.fetch` to stub `studio-upload`. Then every editor write is captured, reads still hit live. Reinstall after each navigation (fresh JS context).

**Debug hook:** `window.__VELLUM` exposes `select(node)`, `edits()`, `pstate()`, `revert(id)`, `pending()`, `flush()`, `isEditing()`, `count()` for parity checks. Commit a text edit via the click-away path (`select` a different node) rather than `blur()` (blur is flaky headless). Multiline fields (P/DIV, e.g. accordion panels) save `innerText`, so the panel must be visually expanded or innerText is empty and nothing saves.

**Write-side check без editing:** read each PDP element's `data-content` attribute after tagPDP runs; that IS the key it will save. **Read-side check:** temporarily add keys to local `js/content-snapshot.js`, load the public (unarmed) page, confirm `product.js applyOverrides()` applied them, then restore the backup (deploy re-bakes it anyway).

**Integrity guard:** hash the live table before/after via anon REST GET `/rest/v1/cloudskin_content?select=key,value` (scratchpad `read-table.mjs`). Baseline 2026-07-25 was 72 keys. Deploy with [[cloudskin-deploy-setup]] (`node scripts/deploy.mjs`). See [[cloudskin-creator-key-contract]].
