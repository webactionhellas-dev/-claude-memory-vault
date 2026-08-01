import type { APIRoute } from 'astro';
import { stripe, WEBHOOK_SECRET } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature') ?? '';
  const raw = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const orderId = session.metadata?.order_id as string | undefined;
    if (orderId) {
      // Only mark-paid + draw down stock once. Stripe retries webhooks, and the
      // inventory decrement is not idempotent — so flip status pending→paid
      // atomically and skip everything if the row was already paid.
      const { data: flipped } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          email: session.customer_details?.email ?? undefined,
          shipping: session.customer_details ?? null,
        })
        .eq('id', orderId)
        .neq('status', 'paid')
        .select('id');

      // If nothing flipped (already paid / retry), don't decrement again.
      if (flipped && flipped.length > 0) {
        // Draw down live stock for each line.
        const { data: items } = await supabaseAdmin
          .from('order_items')
          .select('product_slug,size,quantity')
          .eq('order_id', orderId);
        for (const it of items ?? []) {
          await supabaseAdmin.rpc('decrement_inventory', {
            p_slug: it.product_slug,
            p_size: it.size,
            p_qty: it.quantity,
          });
        }
      }
    }
  }

  return new Response('ok', { status: 200 });
};
