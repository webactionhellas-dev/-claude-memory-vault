// ============================================================================
// CloudSkin, stripe-webhook  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// PUBLIC endpoint (deploy with --no-verify-jwt): Stripe (not a signed-in user)
// calls it, so auth is the Stripe SIGNATURE, not a Supabase JWT. This is the
// SINGLE SOURCE OF TRUTH for "paid".
//
// Guarantees:
//  * signature verified (constructEventAsync + SubtleCrypto) or 400,
//  * idempotent: the Stripe EVENT id is inserted into stripe_events first; a
//    duplicate (retry/replay) short-circuits with 200 and no side effects,
//  * mark-paid is atomic (.neq('status','paid')) as a second guard,
//  * Shopify sync degrades gracefully: a paid order is recorded even when the
//    Shopify Admin token is missing or the Admin API fails (no sale is lost).
// ============================================================================
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { getSecret, serviceClient, serviceReady } from '../_shared/env.ts';
import { getStripe, constructEvent, type Stripe } from '../_shared/stripe.ts';
import { createShopifyOrder } from '../_shared/shopify.ts';
import { fromMinorUnits } from '../_shared/money.ts';

const ok = (body: unknown = { received: true }, status = 200) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return ok('method not allowed', 405);
  if (!serviceReady()) return ok('not configured', 503);

  const stripe = await getStripe();
  const webhookSecret = await getSecret('STRIPE_WEBHOOK_SECRET');
  if (!stripe || !webhookSecret) return ok('webhook not configured', 503);

  // Raw body is required for signature verification (verify over exact bytes).
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = await constructEvent(stripe, raw, sig, webhookSecret);
  } catch (err) {
    // Bad or missing signature: reject. Never process an unsigned event.
    return ok(`signature verification failed: ${(err as Error).message}`, 400);
  }

  const supabase = serviceClient();

  // --- idempotency: claim the event id first ---
  const { error: eventErr } = await supabase
    .from('stripe_events')
    .insert({ id: event.id, type: event.type });
  if (eventErr) {
    // 23505 = unique_violation => already handled. Ack so Stripe stops retrying.
    if ((eventErr as any).code === '23505') return ok({ received: true, duplicate: true });
    // Any other insert error: 500 so Stripe retries later.
    console.error('[webhook] stripe_events insert failed:', eventErr.message);
    return ok('ledger write failed', 500);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Only fulfil when the money is actually captured. Delayed-notification
        // methods (SEPA, iDEAL, Bancontact, Klarna) fire this event with
        // payment_status='unpaid'; leave the order pending and wait for
        // async_payment_succeeded. Card checkouts complete as 'paid' and fulfil now.
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.payment_status === 'paid' || s.payment_status === 'no_payment_required') {
          await markPaidAndSync(supabase, stripe, event);
        }
        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        // Delayed-method funds have cleared -> fulfil.
        await markPaidAndSync(supabase, stripe, event);
        break;
      }
      case 'checkout.session.async_payment_failed': {
        const s = event.data.object as Stripe.Checkout.Session;
        await setStatusIfPending(supabase, s.metadata?.order_id, 'failed', event.id);
        break;
      }
      case 'checkout.session.expired': {
        const s = event.data.object as Stripe.Checkout.Session;
        await setStatusIfPending(supabase, s.metadata?.order_id, 'cancelled', event.id);
        break;
      }
      case 'charge.refunded': {
        const c = event.data.object as Stripe.Charge;
        // Stripe fires charge.refunded for PARTIAL refunds too (amount_refunded <
        // amount). Only flip a paid order to 'refunded' when the WHOLE charge was
        // refunded, and keep the original paid-event audit id (do not overwrite it).
        const fullyRefunded = c.refunded === true ||
          (typeof c.amount_refunded === 'number' && typeof c.amount === 'number' && c.amount_refunded >= c.amount);
        if (fullyRefunded && typeof c.payment_intent === 'string') {
          await supabase.from('stripe_orders')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent', c.payment_intent)
            .eq('status', 'paid');
        }
        break;
      }
      default:
        // Unhandled types are acknowledged (200) so Stripe does not retry them.
        break;
    }
  } catch (e) {
    // Processing failed AFTER we claimed the event id. RELEASE the claim so Stripe's
    // retry (or a manual replay) can reprocess instead of being short-circuited as a
    // duplicate, and return 500 so Stripe actually retries. This is what stops a
    // transient DB blip from stranding a real paid sale. (Shopify-sync failures do
    // NOT throw; they are recorded as 'failed' for backfill, so we only reach here on
    // a genuine order-state failure, which must be retried.)
    console.error('[webhook] processing error:', (e as Error).message);
    try { await supabase.from('stripe_events').delete().eq('id', event.id); }
    catch (delErr) { console.error('[webhook] failed to release event claim:', (delErr as Error).message); }
    return ok('processing error, will retry', 500);
  }

  return ok();
});

// ---------------------------------------------------------------------------
async function setStatusIfPending(
  supabase: ReturnType<typeof serviceClient>,
  orderId: string | undefined,
  status: string,
  eventId: string,
) {
  if (!orderId) return;
  await supabase.from('stripe_orders')
    .update({ status, stripe_event_id: eventId })
    .eq('id', orderId)
    .eq('status', 'pending');
}

function extractShipping(session: Stripe.Checkout.Session): any {
  const anySession = session as any;
  const shipping =
    anySession.collected_information?.shipping_details ??
    anySession.shipping_details ??
    (session.customer_details
      ? { name: session.customer_details.name, address: session.customer_details.address, phone: session.customer_details.phone }
      : null);
  return shipping ?? null;
}

async function markPaidAndSync(
  supabase: ReturnType<typeof serviceClient>,
  _stripe: Stripe,
  event: Stripe.Event,
) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  const shipping = extractShipping(session);
  const email = session.customer_details?.email ?? session.customer_email ?? null;

  // Atomic pending -> paid. If nothing flips (already paid), skip side effects.
  const { data: flipped, error: flipErr } = await supabase
    .from('stripe_orders')
    .update({
      status: 'paid',
      stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      stripe_event_id: event.id,
      email: email ?? undefined,
      shipping,
      presentment_currency: session.currency ?? null,
      presentment_total_cents: session.amount_total ?? null,
    })
    .eq('id', orderId)
    .neq('status', 'paid')
    .select('id, base_currency, base_total_cents')
    .maybeSingle();

  // A real DB error must NOT be mistaken for an idempotent no-op: throw so the caller
  // releases the event claim and returns 500 (Stripe retries). Only a clean null
  // (0 rows matched) means the order is already paid / not found.
  if (flipErr) throw new Error(`paid-flip failed for order ${orderId}: ${flipErr.message}`);
  if (!flipped) return; // already paid / not found -> idempotent no-op

  await supabase.from('stripe_events').update({ order_id: orderId }).eq('id', event.id);

  // --- Shopify fulfilment sync (graceful) ---
  const adminToken = await getSecret('SHOPIFY_ADMIN_TOKEN');
  const { data: items } = await supabase
    .from('stripe_order_items')
    .select('shopify_variant_id, quantity')
    .eq('order_id', orderId);

  const lineItems = (items ?? [])
    .filter((it) => it.shopify_variant_id)
    .map((it) => ({ variantId: it.shopify_variant_id as string, quantity: it.quantity as number }));

  const result = await createShopifyOrder(
    {
      email: email ?? '',
      currency: flipped.base_currency ?? 'eur',
      totalMajor: fromMinorUnits(flipped.base_total_cents ?? 0, flipped.base_currency ?? 'eur'),
      lineItems,
      shipping,
      stripeSessionId: session.id,
      stripeOrderId: orderId,
    },
    adminToken,
  );

  await supabase.from('stripe_orders').update({
    shopify_sync_status: result.status,
    shopify_order_id: result.shopifyOrderId ?? null,
    shopify_sync_error: result.error ?? null,
  }).eq('id', orderId);

  if (result.status === 'failed') {
    console.error(`[webhook] Shopify sync failed for order ${orderId}:`, result.error);
  }
}
