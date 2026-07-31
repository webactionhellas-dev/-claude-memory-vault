---
name: nextjs-flight-length-prefix-trap
description: Editing content inside optimized Next.js static-export RSC flight rows blanks the page unless the T<hexlen> byte prefix is updated
metadata: 
  node_type: memory
  type: reference
  originSessionId: 839c39ba-bab2-4dc7-8d24-4e915e5a7f9d
---

In "optimized" Next.js App Router static exports (the split `js/001.js`–`js/0NN.js` + `__next_f.push([1,"..."])` chunk format, e.g. the Trattoria Capanna site), some React Server Component flight rows are **length-prefixed**, not newline-delimited: `2:T428,{...json...}`. The `T428` = hex **UTF-8 byte length** (0x428 = 1064) of the row's content; React reads exactly that many bytes to find where the row ends.

If you hand-edit the embedded content (e.g. the JSON-LD `<script type="application/ld+json">` payload, which lives in its own flight fragment file), the byte length changes but the `T<hex>` prefix does NOT auto-update. React then over/under-reads, corrupts the next row, and at stream close throws **`Error: Connection closed.`** (from React DOM, e.g. `js/003.js`). Symptom: total **black/blank screen** — body wiped to only `<script>`/`<link>`, `scrollHeight:0`, every client component (header/main/sections) gone.

**Fix:** recompute `Buffer.byteLength(content,'utf8')`, convert to hex, replace the prefix (the `N:T<hex>,` marker usually sits at the END of the preceding chunk file). Trattoria Capanna: Italy→Athens rebrand shrank the JSON-LD from 1064→929 bytes, so `2:T428,` in `js/016.js` had to become `2:T3a1,`.

**Debugging tips:** preview console capture was empty on this machine — inject `window.__caught` error listeners into `<head>` and read back via `preview_eval`. After fixing, the page may still fail on the same origin/port due to **browser HTTP cache** (old chunk cached next to new one) — verify on a fresh port. Scan for affected rows with regex `([0-9a-f]+):T([0-9a-f]+),` over the reassembled `__next_f` buffer. Plain JSON rows like `16:{...}` (metadata) are newline-delimited and safe to edit. Fixed deliverable: `Downloads\trattoria-capanna-FIXED.zip`. Related: [[preview-screenshot-timeout]].
