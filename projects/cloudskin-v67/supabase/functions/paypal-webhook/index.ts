// ============================================================================
// CloudSkin, paypal-webhook  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// PUBLIC endpoint (deploy with --no-verify-jwt): PayPal (not a signed-in user)
// calls this, so auth is the PayPal WEBHOOK SIGNATURE, not a Supabase JWT. This
// is the ASYNC safety net for the PayPal rail: capture-paypal-order (the
// browser's synchronous onApprove call) is the fast path, but a closed tab or a
// dropped network request must not silently lose a paid order — this webhook
// guarantees fulfilment happens even if the customer's browser never confirms.
//
// Guarantees (mirroring stripe-webhook's house pattern):
//  * signature verified via PayPal's own verify-webhook-signature API (see
//    _shared/paypal.ts for why this is preferred over hand-rolled cert-chain
//    verification) or 400,
//  * idempotent: the PayPal EVENT id is inserted into paypal_events first; a
//    duplicate (retry/replay) short-circuits with 200 and no side effects,
//  * the actual capture/fulfil step is _shared/paypal-checkout.ts's
//    completePayPalOrder(), the SAME function capture-paypal-order calls, whose
//    `.eq('status','pending')` guard makes it safe no matter which of the two
//    paths (this webhook or the browser's synchronous call) gets there first.
// ============================================================================
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { serviceClient, serviceReady } from '../_shared/env.ts';
import { verifyPayPalWebhookSignature } from '../_shared/paypal.ts';
import { completePayPalOrder } from '../_shared/paypal-checkout.ts';

const ok = (body: unknown = { received: true }, status = 200) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Pull the PayPal order id out of whichever event resource shape we handle. */
function orderIdFromEvent(event: any): string | null {
  const resource = event?.resource;
  if (!resource) return null;
  // CHECKOUT.ORDER.APPROVED: resource IS the order (resource.id is the order id).
  if (event.event_type === 'CHECKOUT.ORDER.APPROVED') return resource.id ?? null;
  // PAYMENT.CAPTURE.COMPLETED / DENIED / REFUNDED etc: resource is the CAPTURE;
  // the order id lives at supplementary_data.related_ids.order_id.
  return resource.supplementary_data?.related_ids?.order_id ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return ok('method not allowed', 405);
  if (!serviceReady()) return ok('not configured', 503);

  // Raw body is required for signature verification (verify over exact bytes).
  const raw = await req.text();

  const verified = await verifyPayPalWebhookSignature(req.headers, raw);
  if (!verified) return ok('signature verification failed', 400);

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return ok('unparseable body', 400); // verified but not JSON — reject, do not guess
  }
  if (!event?.id || !event?.event_type) return ok({ received: true, skipped: 'no event id/type' });

  const supabase = serviceClient();

  // --- idempotency: claim the event id first (SAME pattern as stripe_events) ---
  const { error: eventErr } = await supabase
    .from('paypal_events')
    .insert({ id: event.id, type: event.event_type });
  if (eventErr) {
    if ((eventErr as any).code === '23505') return ok({ received: true, duplicate: true }); // already handled
    console.error('[paypal-webhook] paypal_events insert failed:', eventErr.message);
    return ok('ledger write failed', 500); // let PayPal retry
  }

  const RELEVANT = new Set(['PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT.ORDER.APPROVED']);
  if (!RELEVANT.has(event.event_type)) {
    // Acknowledged but not acted on (e.g. CAPTURE.DENIED / CAPTURE.REFUNDED are
    // informational here; refunds are handled the same manual way Stripe's
    // charge.refunded currently is — not yet automated for either rail).
    return ok({ received: true, ignored: event.event_type });
  }

  const orderId = orderIdFromEvent(event);
  if (!orderId) return ok({ received: true, skipped: 'no order id in event' });

  try {
    const result = await completePayPalOrder(orderId);
    if (result.status === 'paid' || result.status === 'already_paid' || result.status === 'pending') {
      return ok({ received: true, orderId, result: result.status });
    }
    // A permanent business-logic rejection (unshippable country, amount
    // mismatch, order not approved yet) — acknowledge so PayPal does not retry
    // forever; this is unusual enough to be worth the console.error for manual
    // follow-up, but retrying will never fix it.
    console.error(`[paypal-webhook] ${event.event_type} for order ${orderId} did not complete:`, result.error);
    return ok({ received: true, orderId, result: 'rejected', reason: result.error });
  } catch (e) {
    // A genuine transient failure (e.g. a DB blip) — release nothing to
    // release (no claim beyond the event-id ledger row) and ask PayPal to retry.
    console.error('[paypal-webhook] processing error:', (e as Error).message);
    return ok('processing error, will retry', 500);
  }
});
