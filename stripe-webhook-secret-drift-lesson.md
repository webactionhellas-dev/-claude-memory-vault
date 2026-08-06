---
name: stripe-webhook-secret-drift-lesson
description: "House lesson (2026-08-06, CloudSkin): a Stripe webhook signing secret silently drifted from what Supabase had stored, 400ing every real payment webhook for ~3.6 days with nobody noticing until a customer's order got stuck. Reusable pattern for any house project using Stripe webhooks + Supabase Edge Functions."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 05f8ccf6-9d93-4373-8068-ecf7f961d3e2
  modified: 2026-08-06T14:04:51.887Z
---

Found and fixed on [[cloudskin-office-session-20260806]] / [[cloudskin-studio-live-and-pending]] LATEST-26. Keeping this as its own file because the pattern applies to any house project on Stripe + Supabase, not just CloudSkin.

## What happened
`stripe-webhook`'s stored `STRIPE_WEBHOOK_SECRET` (a Supabase Edge Function secret) no longer matched what Stripe was actually signing deliveries with. Stripe **never re-exposes a secret after endpoint creation** — there is no API call that returns it — so this class of drift is structurally invisible until something downstream breaks. Every real webhook delivery was 400ing on signature verification. Effect: Stripe payments succeeded, but the order never flipped to `paid` in Supabase and never synced to Shopify/DHL. A real customer (Kimberley Thomson, Australia) had a genuinely-paid order stuck at `pending` for this reason — found by cross-checking a stuck DB row directly against Stripe's own PaymentIntent record, then confirming via Edge Function logs that `stripe-webhook` had been returning repeated 400s for ~3.6 days.

## How it was fixed
1. Deployed a tiny **read-only** diagnostic function that lists Stripe's registered webhook endpoints via Stripe's own API (metadata only — Stripe's API never returns the actual secret, so nothing sensitive was exposed by this).
2. Confirmed the endpoint itself was fine (correct URL, correct events, `status: enabled`) — only the locally-stored secret was wrong.
3. Created a **replacement** webhook endpoint, captured its freshly-generated secret immediately (the only moment Stripe ever shows it), persisted to Supabase. Old endpoint disabled, not deleted (reversible).
4. Manually reconciled the one stuck real order → pushed to Shopify → confirmed live in DHL Express Commerce's "New" queue as order #1009.
5. Checked the other 7 stuck-looking orders — all genuinely abandoned carts, not hidden instances of the same bug.

## The permanent safety net (the actual fix, not just the patch)
Built `stripe-pending-reconciler` — a new Edge Function, deployed, on a **cron job every 15 minutes** (`*/15 * * * *`, confirmed active in `cron.job`). It cross-checks every `pending` order **directly against Stripe's own records** (not against our own webhook having fired), auto-heals any mismatch it finds, and emails Mike the moment it has to intervene. This means a future recurrence of this exact bug class gets caught and self-healed within 15 minutes instead of being discovered by an angry customer or Larissa.

## Second bug found in the same pass: shared-code drift across functions
While fixing the secret, found `stripe-webhook` was also running a **3.6-day-stale copy** of the shared `fulfillment.ts` — older than `capture-paypal-order`'s copy, missing a (currently dormant, harmless) direct-DHL-shipment trigger added since. **Supabase Edge Functions each bundle their own copy of shared files at deploy time — deploying one function does NOT propagate a shared-file change to any other function that also bundles it.** Redeployed `stripe-webhook` and the new `stripe-pending-reconciler` with the current canonical `fulfillment.ts` so every fulfillment call-site is byte-identical again. PayPal's rail (`paypal-webhook`) was checked and is NOT at risk of this class of bug — it verifies signatures live against PayPal's own API every time, no locally-cached secret to drift.

## The generalizable rule — apply to every house project on this stack
1. **Any secret that is set-once-and-never-re-readable (webhook signing secrets, some OAuth client secrets) is a silent-drift risk by construction.** Don't rely on "the webhook will error loudly if it's wrong" — it won't surface anywhere a human is watching by default. Build a reconciler that cross-checks the source-of-truth API directly, the way `stripe-pending-reconciler` does, for any payment-critical webhook.
2. **When a shared file used by multiple Edge Functions changes, redeploy every function that bundles it — not just the one you were actively editing.** This was the literal cause of tonight's second bug, and separately caused a real preview-vs-real-charge mismatch during the duty/VAT build (see [[cloudskin-duty-vat-system]]) when only some of the 4 checkout functions got the updated shared file. Treat "which functions bundle this shared file" as a checklist, not a guess, before calling a shared-code change done.
3. **Mike's explicit standing instruction from tonight: this bulletproofing (the reconciler + the "redeploy every function that shares this code" discipline) must always be part of any future deploy bundle for this class of change — never let it regress or get skipped in a future session's rush.**

## Loose end
The temporary diagnostic function (`stripe-webhook-diag`) used to inspect Stripe's registered endpoints was NOT actually deleted — confirmed still present in `list_edge_functions` (slug `stripe-webhook-diag`, v5, `verify_jwt: true`) as of this check. The session said it was "locking it down," which appears to mean a redeploy with reduced scope rather than removal. Worth deleting outright next time someone's in the Supabase dashboard for CloudSkin, since it was built with broad Stripe API read access.
