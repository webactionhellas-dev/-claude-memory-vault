import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin, adminReady } from '@/lib/supabase-admin';
import { stripe, stripeReady } from '@/lib/stripe';
import { sendEmail } from '@/lib/email';
import { buildRefundEmail, type EmailItem } from '@/lib/order-email';

export const prerender = false;

const SITE = import.meta.env.PUBLIC_SITE_URL || 'https://drip.store';

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

// Full refund v1, admin-triggered. Order of operations is deliberate:
// 1. refund at Stripe (idempotency key = order id, so a double-click cannot
//    refund twice even if our DB write later fails),
// 2. flip status to 'refunded' (conditional, idempotent),
// 3. optional restock via the increment_inventory RPC (needs the proposed
//    migration; reported per-line, never blocks the refund),
// 4. refund-confirmation email (best-effort).
export const POST: APIRoute = async ({ request, cookies }) => {
  const g = await requireAdmin(cookies, request);
  if (!g.ok) return json({ error: g.error }, g.status);
  if (!adminReady()) return json({ error: 'Server not configured.' }, 503);
  if (!stripeReady()) return json({ error: 'Stripe is not configured.' }, 503);

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? '');
  const restock = body?.restock === true;
  if (!id) return json({ error: 'Bad request.' }, 400);

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id,status,email,total_cents,stripe_payment_intent')
    .eq('id', id)
    .single();
  if (!order) return json({ error: 'Order not found.' }, 404);
  if (order.status === 'refunded') return json({ error: 'Already refunded.' }, 409);
  if (!['paid', 'fulfilled'].includes(order.status)) {
    return json({ error: `Cannot refund a ${order.status} order.` }, 409);
  }
  if (!order.stripe_payment_intent) {
    return json({ error: 'No Stripe payment on file for this order.' }, 409);
  }

  // 1) Stripe refund (full). The idempotency key makes retries safe.
  try {
    await stripe.refunds.create(
      { payment_intent: order.stripe_payment_intent },
      { idempotencyKey: `refund_${order.id}` },
    );
  } catch (e: any) {
    // charge_already_refunded = refunded in the dashboard; fall through and
    // reconcile our status instead of failing.
    if (e?.code !== 'charge_already_refunded') {
      console.error('[refund] Stripe refund failed:', e?.message ?? e);
      return json({ error: 'Stripe refused the refund. Check the payment in the dashboard.' }, 502);
    }
  }

  // 2) Flip status (idempotent; charge.refunded webhook may also race us).
  await supabaseAdmin
    .from('orders').update({ status: 'refunded' }).eq('id', id).neq('status', 'refunded');

  // 3) Optional restock.
  let restocked = 0;
  let restockError: string | null = null;
  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('product_slug,name,brand,size,quantity,unit_price_cents')
    .eq('order_id', id);
  if (restock) {
    for (const it of items ?? []) {
      const { error } = await supabaseAdmin.rpc('increment_inventory', {
        p_slug: it.product_slug,
        p_size: it.size,
        p_qty: it.quantity,
      });
      if (error) { restockError = error.message; break; }
      restocked++;
    }
    if (restockError && /increment_inventory/.test(restockError)) {
      restockError = 'Restock needs the pending increment_inventory migration; adjust stock manually in /admin/products.';
    }
  }

  // 4) Customer email (best-effort).
  if (order.email && !order.email.endsWith('@drip.local')) {
    try {
      await sendEmail({
        to: order.email,
        ...buildRefundEmail(
          { orderId: id, totalCents: order.total_cents ?? 0 },
          (items ?? []) as EmailItem[],
          { siteUrl: SITE },
        ),
      });
    } catch (e: any) {
      console.error('[email] refund email failed (refund unaffected):', e?.message ?? e);
    }
  }

  return json({ ok: true, restocked, restockError });
};
