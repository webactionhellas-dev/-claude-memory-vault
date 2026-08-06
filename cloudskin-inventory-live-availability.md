---
name: cloudskin-inventory-live-availability
description: "CloudSkin's real-time size/stock-availability system, audited end-to-end 2026-08-06: the live disable/strikethrough mechanism (js/product.js syncAvailability + js/shopify.js available()) is real, site-wide, and correctly working for every product. BUT a separate real bug was found and fixed the same night: js/curate.js hardcoded a stale 'Founders' Edit' sizes list for 5 products that silently overwrote the real Shopify-synced sizes in products.js, putting a non-existent Ace Dress 'L' size live and purchasable. Fixed by deleting the sizes overrides; products.js is now the sole source of truth for sizes, enforced structurally."
metadata:
  node_type: memory
  type: project
  originSessionId: 05f8ccf6-9d93-4373-8068-ecf7f961d3e2
  modified: 2026-08-06T14:16:29.258Z
---

Larissa (via Mike) asked whether the frontend "tracks inventory correctly" — her example: the Ace Dress
inventory in Shopify has no L size, but the live site showed L as a normal, enabled, purchasable button; she
was about to add real L stock and worried the site wouldn't correctly flip it to available once she did.
Mike then broadened scope explicitly: "for every product not only for ace dress."

## Two genuinely separate systems — don't conflate them
1. **Real-time STOCK-LEVEL availability (0 stock vs. in stock) for a size that legitimately exists as a
   Shopify variant.** This system already existed, is correct, and needed no fix.
2. **Whether a size button exists AT ALL, regardless of stock.** This is driven purely by `p.sizes` (an array
   of strings, not stock-aware) and is a COMPLETELY DIFFERENT code path from #1. This is where the real bug
   was — see "THE REAL BUG" below.

## System 1: live stock-level availability — confirmed working correctly, no fix needed
- `js/shopify.js`: one bulk GraphQL query on page load fetches `availableForSale` + `selectedOptions` for
  every real variant of every product from the public Storefront API, into an in-memory map.
  `C.shopify.available(handle, color, size)` looks up the exact variant's `availableForSale`. Deliberately
  FAIL-OPEN on any unknown/unmatched variant (returns `true`) — "never block a sale we can't verify."
- `js/product.js`'s `syncAvailability()` runs on page load, on `cloudskin:shopify-ready`, and on every colour
  swap: disables (`b.disabled`, `aria-disabled`, tooltip) any size button whose real variant is out of stock,
  clears the selection if the selected size just went OOS, and greys the matching option in the sticky
  add-to-bag dropdown. Real CSS: `css/main.css` `.opts button:disabled { text-decoration: line-through; ... }`.
  Two more defensive backstops exist at add-to-cart click and at the cart-data layer.
- Verified live against 2 real 0-stock variants (Elevate Cropped Jacket Black/XL, Drift Cropped Jacket
  White/XL) via the real public Storefront API — both correctly report `availableForSale: false`, buttons
  correctly disabled live.
- Full-catalog Shopify Admin API scan (80 variants, every product): **zero** variants have "continue selling
  when out of stock" enabled — the one Shopify setting that would silently defeat this whole mechanism. Safe
  everywhere in the catalog right now, not just spot-checked.
- **Nothing to do here.** Ordinary restocking (Larissa adding stock to an EXISTING size option in Shopify)
  needs zero developer action — this system picks it up automatically on the next page load.

## System 2: THE REAL BUG — `js/curate.js` silently overwrote real sizes with a stale hardcoded list
My first pass at explaining "Ace Dress shows a phantom L" wrongly blamed browser/CDN caching (Mike correctly
rejected this: "I DID HARD REFRESH AND THE L BUTTON IS STILL AVAILABLE... STOP SAYING SLOP"). The caching
theory was falsified conclusively: fetching `js/products.js` under a version URL that had NEVER been served
before (a fresh deploy's `?v=82`) still rendered "L" live, which is structurally impossible if the file's own
content were the problem — the file genuinely only ever said `sizes: ["S","M"]`, confirmed via direct network
capture inside the live browser session, byte-for-byte.

**Real cause, found by grepping every script loaded on the product page for writes to `.sizes`:**
`js/curate.js` is a merchandising-enrichment overlay ("the Shopify store carries no tags/product_type, so the
sync script can't derive site taxonomy... this file enriches the REAL synced catalog") that runs AFTER
`products.js` and mutates `window.CLOUDSKIN_PRODUCTS` in place. Its `CURATE` object had a leftover hand-authored
`sizes:` field (commented `/* Founders' Edit size guide */` — predates the real Shopify sync entirely) on 5
specific handles: `the-performance-tank`, `the-performance-tee`, `the-flow-dress`, `the-ace-dress`,
`the-performance-shorts`. Its merge loop blindly copied `sizes` from `CURATE` onto every matching product,
**overwriting the correct, live, Shopify-synced value from `products.js` on every single page load** — Ace
Dress has never had a real "L" Shopify variant; the button was 100% fake and fully clickable/purchasable, not
a caching artifact, not a display bug — a real sale-blocking-risk bug. (This also explains why the Elevate
Cropped Jacket was NOT affected: it has no `sizes:` entry in `CURATE`, so its real synced value passed through
untouched.)

**Fix (shipped + verified live, 2026-08-06):** removed the `sizes:` field from all 5 `CURATE` entries in
`js/curate.js`, and removed `"sizes"` from the generic override-merge key array (`["category","gender",
"fabric","support","rating","reviewCount","blurb"]` — `"sizes"` deliberately excluded now, with a comment
explaining why). `products.js` (kept current by `scripts/sync-catalog-from-shopify.mjs`) is now the sole
source of truth for sizes, structurally — `curate.js` can never touch it again. Verified live: Ace Dress now
renders S/M only; the other 4 previously-clobbered products now render their real synced sizes (all came back
as `["S","M","L","XL"]`, matching a fresh `sync-catalog-from-shopify.mjs` re-run that reported 0 drift against
live Shopify).

**Open follow-up (not yet done, flagged in [[cloudskin-office-session-20260806]]):** worth a second look at
whether any OTHER field in `CURATE` (category/gender/fabric/rating/etc.) carries the same "hand-authored,
predates real sync, silently overwrites real data" risk. Those are genuinely merchandising-only fields with
no real-data source to contradict, so lower risk than sizes was, but unaudited.

See [[cloudskin-office-session-20260806]] for the full session and [[live-site-editor-product]] /
[[Creator key contract]] for the unrelated-but-similarly-shaped "phantom edit" class of bug in the Vellum
on-canvas editor (confirmed NOT the cause here — `edit-mode.js` is self-gated behind an armed Creator session
and was not even running during reproduction).
