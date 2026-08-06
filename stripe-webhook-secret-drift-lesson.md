---
name: stripe-webhook-secret-drift-lesson
description: "Reusable house lesson (any Stripe-integrated project, not just CloudSkin): a Stripe webhook signing secret can silently drift from what's stored in your backend with ZERO warning, permanently 400ing every real webhook so paid orders never fulfill — Stripe never re-exposes a secret after creation, so it's undetectable until something breaks. Standing rule from Mike (2026-08-06): every future edge-function bundle touching payments/fulfillment must ship the CURRENT shared fulfillment code, and every payment rail needs an automated reconciler that can self-heal without a human noticing first."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 05f8ccf6-9d93-4373-8068-ecf7f961d3e2
  modified: 2026-08-06T14:15:55.456Z
---

## The incident (CloudSkin, 2026-08-06)
Larissa completed a real payment; it never showed up in DHL Express Commerce. Diagnosis (do this exact
sequence for any "payment succeeded but nothing downstream happened" report):
1. Read the actual webhook handler source — don't guess from logs/timestamps. In CloudSkin's
   `stripe-webhook/index.ts` the ONLY 400-causing path is the `constructEvent()` signature-verification
   catch block.
2. List the real webhook endpoints via the Stripe API directly (not the dashboard, not memory) and check
   each session's real `payment_status`.
3. Found: every real delivery was 400ing on signature mismatch. The locally-stored `STRIPE_WEBHOOK_SECRET`
   (in `app_secrets`) no longer matched what Stripe was actually signing with.

**Why this is dangerous and easy to miss:** Stripe shows you a webhook signing secret exactly ONCE, at
endpoint-creation time. It is never re-displayed anywhere in the dashboard. If your stored copy ever diverges
from Stripe's live value (endpoint recreated, secret rotated, config drift, a bad copy-paste months ago) there
is no error, no alert, no dashboard warning — Stripe just keeps sending webhooks, your backend just keeps
400ing them, and NOTHING downstream (Shopify order creation, DHL fulfillment, confirmation emails) ever fires,
silently, until a real customer notices their order never shipped.

**The fix (standard Stripe remediation, do this whenever this bug is suspected):**
1. Create a NEW Stripe webhook endpoint (same URL, same event list). Its creation response is the ONLY time
   the new secret is ever shown — capture and persist it immediately.
2. Disable (don't delete) the old endpoint, for audit trail.
3. Manually reconcile any orders that got stuck during the outage window: for each, replicate the exact
   fulfillment logic the webhook would have run (atomic paid-flip + `fulfillPaidOrder()`), don't hand-write a
   one-off version — use the real shared function so behavior matches production exactly.
4. Build (or confirm you already have) an automated reconciler as a permanent safety net — see below.

## Standing rule from Mike (2026-08-06), applies to ALL future work, any project
> "I don't want any webhooks to miss like the stripe which caused the issue with dhl. we fixed that so it has
> always to be included in any future bundles."

**How to apply:** whenever you redeploy ANY payment-adjacent Supabase edge function (webhook handlers, capture
endpoints, reconcilers — anything that calls into a shared fulfillment/order module), you MUST:
- Bundle the CURRENT version of every shared file it depends on (`_shared/fulfillment.ts` etc.) — diff it
  against the other call-sites that use the same shared code first if there's any doubt they're in sync.
  This exact bug bit CloudSkin twice in one incident: the webhook's `STRIPE_WEBHOOK_SECRET` had drifted, AND
  separately its bundled `fulfillment.ts` was 3.6 days staler than `capture-paypal-order`'s copy of the same
  file. Both are the same root problem (silent per-function drift in code that's supposed to be identical
  everywhere) and both must be checked, every time.
- Never treat "the webhook used to work" as evidence it still works. Verify live: real endpoint list from the
  provider's API, a real recent event's actual delivery status, not just "the code looks right."
- Confirm an automated reconciler exists and is scheduled for EVERY payment rail in use, not just the one
  that just broke. CloudSkin's `stripe-pending-reconciler` (cron every 15 min) cross-checks pending Stripe
  sessions against Stripe's real API and self-heals; PayPal's rail was confirmed to not need one (see below).

## Which payment rails are structurally immune vs. at-risk
- **At risk (locally-cached secret pattern): Stripe webhooks.** The signing secret is a static value your
  backend stores and compares against — it can drift with zero live signal. Needs a reconciler.
- **NOT at risk: PayPal.** `verifyPayPalWebhookSignature` calls PayPal's OWN
  `/v1/notifications/verify-webhook-signature` API live, on every single request — there is no locally-cached
  secret to drift. Confirmed current and correct 2026-08-06, no reconciler needed for this rail specifically,
  but still worth having one if a second payment provider is ever added that uses the local-secret pattern.
- **General principle:** any verification/auth scheme where you store a copy of a value the provider
  generated is a drift risk by construction, no matter how unlikely rotation seems. If the provider only shows
  the value once and never re-displays it, that's the strongest signal you need an independent reconciler,
  not just correct code at write-time.

See [[cloudskin-office-session-20260806]] for the full incident timeline and the specific order reconciled
(Kimberley Thomson, Australia, order #1009).
