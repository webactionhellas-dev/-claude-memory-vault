---
name: cloudskin-session-20260807
description: "CloudSkin 2026-08-07 — NEWEST STATE: confirmed LIVE via Supabase logs that stripe-webhook is STILL 400ing continuously (webhook signing secret drifted again, same class as the 2026-08-06 incident) — the payment reconciler is masking it by healing every ~15min, which is why Mike keeps getting 'Payment reconciler auto-fixed' emails; root cause not re-fixed this session. Also: reconciler hardened to always detect a broken STRIPE_SECRET_KEY (separate secret, caused a 401 earlier today), DHL watchdog extended to catch Shopify-fulfilled-but-untracked orders (the #1002 pattern), and a real blog post shipped via a Shopify-sourced gen-blog.mjs pipeline"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-07T19:40:35.111Z
  originSessionId: 628cab7d-e427-4e6b-aa64-f86536849b5b
---

Supersedes [[cloudskin-office-session-20260806]] as the current state pointer. Source `C:\Users\mikef\cloudskin-v67` on the home machine, git-synced clean with origin (`webactionhellas-dev/cloudskin-v67`, branch main, no ahead/behind) — office (nospa) auto-commits as `mikefalcos2004-sudo` every ~10min, home commits as `Mike`. Confirmed this by direct git log + `git fetch`, not from memory — see [[cloudskin-canonical-folder-check]].

## The recurring watchdog emails — root cause found 2026-08-07 evening
Mike asked why he keeps getting "Payment reconciler: N order(s) auto-fixed" emails from CLOUDSKIN Watchdog. Checked live, not from memory:
- Supabase `get_logs` (edge-function) showed `stripe-webhook` returning **400 repeatedly and continuously**, including as recently as ~1 minute before the check — this is an ONGOING failure, not a historical one-off.
- `fulfillment_bundle_log` shows all 5 payment functions (`stripe-webhook`, `stripe-pending-reconciler`, `capture-paypal-order`, `paypal-webhook`, `paypal-pending-reconciler`) still reporting the SAME bundle version `2026-08-06a` — no shared-code drift, rules out the item-4 bug class from [[stripe-webhook-secret-drift-lesson]].
- `stripe-webhook`'s own `updated_at` is still Aug 6 (never redeployed today) — so this is almost certainly `STRIPE_WEBHOOK_SECRET` having silently drifted AGAIN (or the Aug 6 fix never fully held), the exact same failure class as the original incident, just recurring.
- **This is a DIFFERENT secret than today's earlier fix.** Today's 12:50-14:50 office session (see below) was chasing a broken `STRIPE_SECRET_KEY` (the API key, caused a 401 on the reconciler's own Stripe lookups) — that's a separate credential from `STRIPE_WEBHOOK_SECRET` (used only for signature verification on incoming webhook deliveries). Fixing/hardening around the former did NOT touch the latter, so the 400s never actually got re-fixed today.
- Net effect: **no orders are being lost** — `stripe-pending-reconciler` runs every 15min, catches every Stripe-paid-but-DB-pending order, and pushes it to Shopify automatically (confirmed live: tonight's order 709919f3/Shopify #7843663413547/petrntinos@gmail.com went `pending`→`paid` in ~9.5 min). But every single real Stripe order is going through the fallback path with a delay, and Mike gets an email each time — that's why "I keep getting these."
- **Not yet done**: re-run the actual Aug 6 fix procedure (create a fresh Stripe webhook endpoint, capture its secret at creation — Stripe never re-exposes an existing one — update the Supabase secret, verify, disable the old endpoint). `stripe-webhook-diag` (the read-only Stripe-endpoint-metadata function from Aug 6) still exists and deployed, useful to confirm before touching anything.

## Also done today (12:50-14:50 local, separate from the above)
- Built `temp-stripe-key-check-20260807` (diagnostic, safe to delete) after the reconciler alerted a 401 looking up a checkout session — confirmed it's a `STRIPE_SECRET_KEY` problem, not the webhook secret.
- Hardened `stripe-pending-reconciler`: now pings `GET /v1/balance` unconditionally before touching any pending order, so a fully-dead `STRIPE_SECRET_KEY` is caught within one 15-min cycle even with zero pending orders (previously only discovered as a side effect of a real lookup). Broken-key state now gets an unmissable `URGENT:` email subject instead of blending into the normal "0 order(s) auto-fixed" no-op subject.
- Extended `dhl-stuck-order-watchdog`: now also flags orders Shopify shows as `fulfilled` but where NO fulfillment record carries a tracking number — the exact silent-failure shape order #1002 hit (DHL Express Commerce marks fulfilled without ever creating a real shipment). Previously only caught by hand, days later.

## Blog, shipped today (16:10-16:50 local)
Real blog post generated and wired live: `blog/womens-padel-outfit-2026.html` via `scripts/gen-blog.mjs`, `js/blog.js`, `blog.html`/`blog-post.html` updated, `sitemap.xml` regenerated, asset-version bumped. A `temp-shopify-blog-check-20260807` diagnostic ran just before, consistent with this pipeline pulling from Shopify rather than (or alongside) the older headless-WordPress Journal path in [[cloudskin-blog-journal]] — worth confirming which is now canonical next session, didn't dig further since Mike only asked whether it saved (it did, fully synced).

## Open for next session
- Re-fix `STRIPE_WEBHOOK_SECRET` for real (see above) — this is the actual fix Mike needs, everything today was around it, not on it.
- Clean up the growing pile of `temp-*-2026080X` diagnostic functions (dozens now active in `list_edge_functions`) — none appear deleted after use despite several memories saying they should be.
- Separately noticed (NOT diagnosed): `cloudskin-order-webhook` (slug `dfee7874...`) is also returning 401 repeatedly in the same log window, mixed with occasional 200s. Different function, different symptom (auth, not signature), untouched since creation (2026-07-something). Flagging only, didn't chase it.
