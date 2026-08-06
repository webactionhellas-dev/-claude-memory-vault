---
name: cloudskin-office-session-20260806
description: "CloudSkin session 2026-08-06 (launch night) — NEWEST STATE, start here: real per-country duty/VAT live on all 4 checkout functions (see [[cloudskin-duty-vat-system]]), Stripe webhook signing-secret silently drifted causing paid orders to never reach Shopify/DHL — found, fixed, permanent reconciler safety net built, and a standing 'never let a bundle miss a fulfillment file again' rule set (see [[stripe-webhook-secret-drift-lesson]]), checkout page now displays duty as its own line, and a curate.js phantom-size bug that put a non-existent Ace Dress 'L' live was found + fixed + the whole deploy pipeline hardened with automatic cache-bust versioning (see [[cloudskin-inventory-live-availability]])"
metadata:
  node_type: memory
  type: project
  originSessionId: 05f8ccf6-9d93-4373-8068-ecf7f961d3e2
  modified: 2026-08-06T15:08:00.327Z
---

Continuation of [[cloudskin-stripe-golive]] / [[cloudskin-office-session-20260729]]. Source repo now
`C:\Users\nospa\cloudskin-v67` (this machine's canonical folder as of tonight — confirm this is still current
in a fresh session, folder names have moved before, e.g. cloudskin-v56 → cloudskin-v67). Supabase project
`ocszztflphqsaoyhlerx`. Deploy = `node scripts/deploy.mjs` from that folder for frontend/static changes (this
script now ALSO auto-bumps the site's cache-bust version and aborts the deploy if that fails — see item 7
below, non-negotiable per Mike). Supabase edge functions deploy separately via the Supabase MCP
`deploy_edge_function` tool (see [[stripe-webhook-secret-drift-lesson]] for the mandatory file-bundling rule).

**Mike's standing instruction from tonight, applies to ALL future work on this project, not just tonight's
fixes:** every deploy/bundle must ship complete — no function, shared file, or key silently missing that can
affect payment or DHL fulfillment (this is why item 7's version-bump automation and
[[stripe-webhook-secret-drift-lesson]]'s bundling rule are now BUILT INTO the deploy tooling itself, not just
documented — they cannot be skipped by forgetting). And: "I want everything in the bundle and in the memory
to continue from home" — this file + its three linked sub-memories are that full record.

## DONE + VERIFIED + LIVE 2026-08-06

**1. Real per-country duty + VAT, live on all 4 checkout paths.** Full technical detail, the exact 32-country
table, sourcing, and every deliberate exclusion is in [[cloudskin-duty-vat-system]] — read that before touching
`_shared/duty-rates.ts` again. Short version: `create-checkout-session`, `create-checkout-elements`,
`create-paypal-order`, and `shipping-quote` all compute real duty+VAT and add it as its own line item
("Import duties & taxes"), verified live via a real Stripe session (France: 353 AED subtotal → 112.96 AED
duty, total 564.02 AED, math confirmed against the DB row). GCC treated as real-duty destinations (Mike's
explicit call, since he didn't know the customs regime — safer-for-Larissa default). Turkey included on
explicit override despite a flagged volatility risk. US/Canada/Lebanon deliberately still excluded (structurally
impossible to pin one honest number, not a guess-avoidance laziness call).

**2. Checkout page duty display FIXED — this was a real, launch-night-discovered bug.** Before tonight,
`js/checkout-page.js`'s on-page order summary added `subtotal + shipping` only — never the duty amount —
even though the ACTUAL Stripe/PayPal charge always included it once shipped. So for any of the 32 covered
countries, the customer saw a lower total on `/checkout` than what they were actually charged at payment,
directly contradicting `legal.js`'s own promise ("the amount charged is the amount shown at checkout"). FIXED:
`refreshShipQuote()` now reads `data.dutyVatMajor` from the `shipping-quote` response, folds it into the
displayed total, and shows a new `#coDutyRow` line ("Duties & taxes", i18n key `cart.dutiesTaxes`, added
natively in all 11 languages) only when non-zero. Deployed and re-shipped again in tonight's later version
bumps (v81→v83), so it is live under the CURRENT asset version, not stranded behind a stale one (see item 7).

**3. STRIPE WEBHOOK SIGNING-SECRET HAD SILENTLY DRIFTED — real incident, found + fixed + hardened.**
Larissa reported a completed payment never showed up in DHL. Root cause: `stripe-webhook`'s stored
`STRIPE_WEBHOOK_SECRET` no longer matched what Stripe was actually signing with (Stripe never re-exposes a
secret after creation, so this class of drift is invisible until something breaks — not caused by anything
touched tonight, pre-existing, timing unknown). Every real webhook delivery was 400ing on signature
verification, so paid orders never flipped to 'paid' and never reached Shopify. Full incident detail, the
exact fix, and the NEW permanent safety net (`stripe-pending-reconciler`, cron every 15 min) is in
[[stripe-webhook-secret-drift-lesson]] — **that memory also encodes Mike's explicit standing rule that this
class of miss must never recur in any future bundle.**
**One real customer order was stuck**: Kimberley Thomson, Australia, order #1009 — reconciled manually,
confirmed landing live in DHL Express Commerce's "New" queue (screenshot-verified by Mike).

**4. `stripe-webhook` was ALSO running 3.6-day-stale shared code (separate finding, also fixed).**
While fixing the secret, found `stripe-webhook`'s bundled `_shared/fulfillment.ts` was an older copy than
`capture-paypal-order`'s — missing a (currently dormant, harmless) direct-DHL-shipment trigger added since.
Redeployed `stripe-webhook` and the new `stripe-pending-reconciler` with the CURRENT canonical
`fulfillment.ts` so all fulfillment call-sites are now byte-identical again. `DHL_DIRECT_SHIP_ENABLED` is
NOT set anywhere (trigger is off) and its target function `create-dhl-shipment` doesn't even exist yet — a
paused/incomplete feature, not a live risk, left alone. PayPal's rail (`paypal-webhook`) verifies signatures
LIVE against PayPal's own API every time (no locally-cached secret), so it does NOT have this drift risk —
confirmed current and correct, no action needed there.

**5. `sync-catalog-from-shopify.mjs` fixed (built earlier this session, had a real bug on first run).**
The regex window between `"handle"` and `"colors"` was too narrow (50 chars) for the real file structure
(title + color fields sit in between) — fixed to 300 chars. ALSO scoped the script to **sizes only, deliberately
NOT colors**: `js/shopify.js`'s `normColor()` has an intentional "White Mist" (display) → "White" (Shopify's
real option value) rename, and the first script version proposed silently reverting that rename on every
product using it — would have undone a deliberate design decision, not fixed a bug. Re-run at the end of
tonight's session too: **0 changes needed, products.js sizes are 100% in sync with real Shopify data right
now.** Safe to re-run any time Larissa adds/removes a size OPTION in Shopify (not needed for ordinary
restocking of an existing size — that is fully automatic, see item 6).

**6. REAL BUG FOUND + FIXED: `js/curate.js` was silently overwriting real Shopify size data with a stale
hardcoded list — this is what put a non-existent "L" live on the Ace Dress.** Full writeup in
[[cloudskin-inventory-live-availability]]. Short version: my first read of this (Mike correctly rejected it,
"STOP SAYING SLOP") wrongly blamed browser cache. The REAL cause: `js/curate.js` is a merchandising-enrichment
overlay that runs after `products.js` and, for 5 specific handles (`the-performance-tank`, `the-performance-tee`,
`the-flow-dress`, `the-ace-dress`, `the-performance-shorts`), had a hand-authored `sizes:` field left over from
before the real Shopify sync existed ("Founders' Edit size guide" comment) — and its merge loop blindly
overwrote `p.sizes` with that stale array for every one of those 5 products, clobbering the correct,
Shopify-synced value every single page load. Ace Dress has NEVER had a Shopify "L" variant; the button was
100% fake, always clickable, always addable to bag — a real, live, sale-blocking-question-worthy bug, not a
caching artifact. **FIXED:** removed the `sizes:` field from all 5 CURATE entries and removed `"sizes"` from
the generic override-merge key list, so `curate.js` can never again touch size truth — `products.js` (kept
current by `sync-catalog-from-shopify.mjs`) is now the sole source for sizes, enforced structurally, not just
by convention. Verified live post-fix: Ace Dress now renders S/M only; the other 4 previously-clobbered
products now render their real synced sizes.

**7. Deploy pipeline hardened: static-asset cache-bust version bump is now AUTOMATIC, every deploy, no
exceptions.** While chasing the Ace Dress bug I found every HTML file references shared JS/CSS via one global
`?v=NN` stamp (`js/products.js?v=80` etc., all 7-11 HTML files always on the same number) and NOTHING in
`scripts/deploy.mjs` ever bumped it — a fully manual step that (separately from the curate.js bug) is exactly
the kind of thing that silently strands a real fix behind a stale cached URL for returning visitors and for
Vercel's own edge cache. Built `scripts/bump-asset-version.mjs` (finds the current max `?v=`, bumps every HTML
file to max+1; `--check` mode reports drift with no write, used by `deploy.mjs --dry-run`) and wired it as a
**mandatory step 0** in `scripts/deploy.mjs`, before the content-snapshot bake — the deploy now aborts if the
bump fails. Live version is now v83 (was v80 at the start of tonight). This is now structurally impossible to
forget on any future CloudSkin deploy.

**8. "So in the future no function will be lost??" — Mike asked directly; real gaps found + closed.**
The bundle-drift detector (item 3/4, see [[stripe-webhook-secret-drift-lesson]]) only catches code MISMATCHES
among functions still running — it said nothing about a function being deleted, and PayPal had no reconciler
at all (only Stripe did). Closed both, live and verified:
- **New `paypal-pending-reconciler` function**: mirrors `stripe-pending-reconciler`, cross-checks any
  `pending` PayPal order directly against PayPal's own status via `completePayPalOrder()` (the same function
  `capture-paypal-order`/`paypal-webhook` already call — safe, idempotent). Scheduled `*/15 * * * *`. Also
  self-reports to the drift check.
- **New function-EXISTENCE check**, folded into `stripe-pending-reconciler`: pings 9 money-path functions
  (deliberately excludes itself — see the bug below) and checks Supabase's gateway `sb-error-code: NOT_FOUND`
  response header (confirmed live against a deliberately-nonexistent slug: this is the real signal a function
  is gone, distinct from any error the function's own code might return). Scoped to the checkout/fulfilment/
  webhook/watchdog path only, NOT every temp-*/diagnostic function in the project — said explicitly to Mike,
  not oversold as blanket "every function" coverage.
- **REAL BUG I introduced and then caught same session**: the first version of the existence check included
  `stripe-pending-reconciler`'s own slug — a function calling its own public HTTPS URL from inside its own
  execution hung indefinitely and blew Supabase's 150s idle timeout on the very first live test. Fixed:
  removed self from the check list (redundant anyway — you're proof you exist) and added an 8s
  AbortController timeout per fetch so nothing in this check can ever hang the whole reconciler again.
  Redeployed (v5), retested: 2.5s, clean. Worth remembering: don't have a periodic self-check function ping
  its own currently-executing URL.
- **Alert emails fixed to go to Mike, not Larissa.** `dhl-stuck-order-watchdog`, `stripe-pending-reconciler`,
  and the new `paypal-pending-reconciler` were all defaulting to `info@cloudskin.com` (the shop inbox).
  Hardcoded fallback changed to `mikefalcos2004@gmail.com` in all 3, per his explicit ask — NOT independently
  re-confirmed by him as the exact right ops-inbox beyond "not larissa but my email", worth a quick check.
- **Final live verification** (after the self-call fix): all 5 fulfillment-bundling functions report the
  SAME version (`2026-08-06a`), `driftDetected: false`, `missingFunctions: []` — clean.
- **Honest scope given to Mike, do not overclaim beyond this later**: this closes the specific incident class
  from tonight (shared-code drift + missing PayPal reconciler + real function deletion on the money path). It
  is NOT an absolute guarantee against every possible future failure mode — a wholly new bug class, or a
  function outside the 9-function existence list breaking, would not be caught.

## KEY GOTCHA FOR THE NEXT SESSION
**Don't trust a first plausible-sounding theory on a data-mismatch bug — verify with the actual live DOM,
not just the fetched file.** Tonight's real lesson: `products.js` (the file) was correct the entire time; the
bug was a SEPARATE script (`curate.js`) mutating the in-memory object after load. Confirming "the file is
right" is not the same as confirming "what actually renders is right" — when they disagree, grep every script
that runs on that page for writes to the field in question before concluding cache/environment weirdness.
Also still true from earlier: **local repo vs. deployed can drift silently** (`stripe-webhook`'s stale
`fulfillment.ts` this session) — always verify against the LIVE deployed artifact, not local file reads,
for anything money- or inventory-critical.

## REMAINING / OPEN
- Canada real per-province GST/HST duty coverage — offered to build (real province-collection UI + rate
  table), not yet started, needs Mike's go-ahead on scope (see [[cloudskin-duty-vat-system]]).
- GCC de-minimis value thresholds (~USD 260-325 per country) are NOT modeled in the duty table — flat % is
  applied regardless of order value, so small GCC orders are conservatively over-charged duty rather than
  under-charged. Documented in the code, not fixed — revisit if GCC volume becomes material.
- Larissa's actual current operating-country list (whether all 39/32 `SHIP_COUNTRIES` are real) — still
  unconfirmed from earlier in this same session, no action taken, needs her direct confirmation.
- Worth a full CURATE-object audit next session for OTHER non-size fields that might carry the same
  "hand-authored, predates real sync, silently overwrites real data" risk (category/gender/fabric/rating are
  genuinely merchandising-only and safe, but this is worth a second look given what sizes turned out to be).
