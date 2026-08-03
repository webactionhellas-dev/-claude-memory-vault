---
name: cloudskin-stripe-checkout-prebuild
description: "CloudSkin's custom Stripe multi-currency + DDP checkout is pre-built (build-ready, NOT deployed), pending Stripe keys + Shopify Admin token + country-of-manufacture"
metadata: 
  node_type: memory
  type: project
  originSessionId: fcd19b5d-d792-44f0-bbb5-5aed4e24130b
  modified: 2026-07-26T02:59:28.907Z
---

Built 2026-07-26 (Echo), then adversarially reviewed + hardened. Replaces the EUR-only Shopify-hosted checkout so shoppers pay in their own currency (Goal A) at duties-inclusive prices (Goal B). Shopify Payments is unavailable to a Dubai company, which is why Goal A was broken. See [[cloudskin-creator-key-contract]] for the storefront, [[cloudskin-deploy-setup]] for deploy.

**Status: BUILD-READY, NOT LIVE.** Feature-flagged OFF (`STRIPE_CHECKOUT_ENABLED=false` in `js/checkout.js`); the live site runs the existing Shopify `cartCreate -> checkoutUrl` redirect unchanged. Nothing applied to live Supabase (migration absent on prod, content table hash unchanged). Do NOT flip on / deploy without Mike's go + the credentials below.

**Files:** `supabase/functions/create-checkout-session/` (re-fetches authoritative Shopify prices server-side, never trusts client amounts; creates the Stripe Checkout Session), `supabase/functions/stripe-webhook/` (signature-verified, idempotent on Stripe event id, single source of truth for "paid", syncs order to Shopify Admin API), `supabase/functions/_shared/*.ts` (pure pricing/money/fx + deno adapters), `supabase/migrations/20260726100000_stripe_checkout.sql` (`stripe_orders`/`stripe_order_items`/`stripe_events`/throttle, RLS), `js/checkout.js` (+3-line guard in `js/shell.js`), `tests/*.test.ts` (19 pass), `supabase/README.md` (activation runbook).

**Key decisions:** Stripe hosted Checkout Session (redirect), not Payment Element (zero CSP change). Adaptive Pricing (Dashboard toggle) is the default for Goal A - Stripe owns FX; the customer pays the ~2-4% conversion fee. Manual FX mode exists behind `CHECKOUT_PRESENTMENT_MODE=manual`. Order syncs into Shopify via Admin order-create -> existing `cloudskin-order-webhook` mirrors to `customer_orders`.

**Adversarial review (workflow, 17 agents) found + FIXED 5 real defects:** (1) CRITICAL fulfil-before-payment - `checkout.session.completed` now gated on `payment_status==='paid'|'no_payment_required'` so delayed methods (SEPA/iDEAL/Klarna) don't ship before funds clear; (2) HIGH lost-order - the paid-flip now throws on a real DB error and the handler releases the event-id claim + returns 500 so Stripe retries; (3) partial-refund only marks 'refunded' when fully refunded; (4) 3-decimal currency (KWD) single-step rounding; (5) checkout.js email uses `C.auth.user()`. Re-verified GREEN.

**Outstanding to go live (from owner/Larissa):** Stripe secret + webhook signing secret (invite webactionhellas@gmail.com or keys) + enable Adaptive Pricing; Shopify Admin API token (`write_orders`); per-product country of manufacture (`COUNTRY_OF_ORIGIN_MAP`). Recommended before volume: an automated backfill sweep over `stripe_orders WHERE status='paid' AND shopify_sync_status IN ('pending','failed','skipped')` (not built yet). Activation order is in `supabase/README.md`; test in Stripe TEST mode first.
