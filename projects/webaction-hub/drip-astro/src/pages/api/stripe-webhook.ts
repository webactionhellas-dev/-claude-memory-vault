import type { APIRoute } from 'astro';
import { stripe, WEBHOOK_SECRET } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { actionForEvent } from '@/lib/fulfillment';
import { fulfilCheckoutSession, cleanupExpiredCheckout } from '@/lib/fulfil-order';
import { sendEmail, ownerNotifyEmail } from '@/lib/email';

export const prerender = false;

// Registered events (Stripe dashboard): checkout.session.completed,
// checkout.session.expired, charge.refunded. The async_payment_* pair is also
// handled so enabling delayed payment methods later needs no code change.
export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature') ?? '';
  const raw = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  if (event.type.startsWith('checkout.session.')) {
    const session = event.data.object as any;
    const orderId = session.metadata?.order_id as string | undefined;
    if (orderId) {
      // Pure, unit-tested routing (lib/fulfillment.ts): the payment_status gate
      // lives there. 'completed' with an unsettled async payment leaves the
      // order pending; fulfilment happens on async_payment_succeeded.
      const action = actionForEvent(event.type, session);
      switch (action) {
        case 'fulfil':
          await fulfilCheckoutSession(session, orderId);
          break;
        case 'wait':
          console.log(
            `[webhook] session completed but payment_status=${session.payment_status}; order ${orderId} stays pending`,
          );
          break;
        case 'fail':
          // The async payment failed: cancel, but never clobber a paid order.
          await supabaseAdmin
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId)
            .eq('status', 'pending');
          console.log(`[webhook] async payment failed; order ${orderId} cancelled`);
          break;
        case 'cleanup': {
          const { deleted } = await cleanupExpiredCheckout(orderId);
          if (deleted) console.log(`[webhook] expired session; pending order ${orderId} removed`);
          break;
        }
      }
    }
  }

  // Refunds made directly in the Stripe dashboard: reconcile our order status.
  // Idempotent via the conditional update; deliberately NO auto-restock (the
  // owner decides stock by hand for dashboard refunds), so we flag it with an
  // owner alert on the first flip only.
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as any;
    const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
    if (pi) {
      const { data: flipped } = await supabaseAdmin
        .from('orders')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent', pi)
        .neq('status', 'refunded')
        .select('id');
      if (flipped && flipped.length > 0) {
        console.log(`[webhook] dashboard refund reconciled for order ${flipped[0].id} (no auto-restock)`);
        const owner = ownerNotifyEmail();
        if (owner) {
          try {
            await sendEmail({
              to: owner,
              subject: `Refund από το Stripe dashboard · #${String(flipped[0].id).slice(0, 8).toUpperCase()}`,
              html: '<p>Η παραγγελία μαρκαρίστηκε refunded μετά από refund στο Stripe dashboard. Το στοκ ΔΕΝ επιστράφηκε αυτόματα, ελέγξτε το απόθεμα στο /admin.</p>',
              text: 'Dashboard refund reconciled. Stock was NOT auto-restocked; review inventory in /admin.',
            });
          } catch { /* alert is best-effort */ }
        }
      }
    }
  }

  return new Response('ok', { status: 200 });
};
