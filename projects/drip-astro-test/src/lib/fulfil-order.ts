// SERVER ONLY. The one place a Checkout Session becomes a fulfilled order:
// shared by the Stripe webhook (live events) and the reconcile cron (stuck
// orders). Both paths funnel through the same idempotent fulfilPaidOrder
// orchestration, so however an order gets fulfilled, stock is drawn down at
// most once and the emails go out at most once.
import { supabaseAdmin } from './supabase-admin';
import { fulfilPaidOrder, cleanupExpiredOrder, type FulfilmentStore, type OrderLine } from './fulfillment';
import { sendEmail, ownerNotifyEmail } from './email';
import { buildOrderEmail, buildOwnerEmail, shippingFromSession, type EmailItem } from './order-email';

const SITE = import.meta.env.PUBLIC_SITE_URL || 'https://drip.store';

/**
 * Fulfil the order for a (paid) Checkout Session and send the emails.
 * Safe to call repeatedly and from multiple paths: the pending->paid flip is
 * atomic, retries skip both the stock drawdown and the emails, and any email
 * failure is logged without affecting the caller.
 */
export async function fulfilCheckoutSession(
  session: any,
  orderId: string,
): Promise<{ fulfilled: boolean }> {
  const store: FulfilmentStore = {
    async markPaidOnce(id) {
      const { data } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          stripe_payment_intent:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
          email: session.customer_details?.email ?? undefined,
          shipping: session.shipping_details ?? session.customer_details ?? null,
        })
        .eq('id', id)
        .neq('status', 'paid')
        .select('id');
      return !!(data && data.length > 0);
    },
    async getLines(id) {
      const { data } = await supabaseAdmin
        .from('order_items')
        .select('product_slug,size,quantity')
        .eq('order_id', id);
      return (data ?? []) as OrderLine[];
    },
    async decrement(line) {
      await supabaseAdmin.rpc('decrement_inventory', {
        p_slug: line.product_slug,
        p_size: line.size,
        p_qty: line.quantity,
      });
    },
  };

  const r = await fulfilPaidOrder(store, orderId);

  if (r.fulfilled) {
    try {
      const to: string | null = session.customer_details?.email ?? session.customer_email ?? null;
      const { data: emailItems } = await supabaseAdmin
        .from('order_items')
        .select('name,brand,size,quantity,unit_price_cents')
        .eq('order_id', orderId);
      let totalCents = typeof session.amount_total === 'number' ? session.amount_total : NaN;
      if (!Number.isFinite(totalCents)) {
        const { data: orderRow } = await supabaseAdmin
          .from('orders').select('total_cents').eq('id', orderId).single();
        totalCents = orderRow?.total_cents ?? 0;
      }
      const shipping = shippingFromSession(session);
      const items = (emailItems ?? []) as EmailItem[];

      if (to) {
        await sendEmail({
          to,
          ...buildOrderEmail({ orderId, totalCents, shipping }, items, { siteUrl: SITE }),
        });
      }
      const owner = ownerNotifyEmail();
      if (owner) {
        await sendEmail({
          to: owner,
          ...buildOwnerEmail({ orderId, totalCents, shipping, customerEmail: to }, items),
        });
      }
    } catch (e: any) {
      console.error('[email] order emails failed (fulfilment unaffected):', e?.message ?? e);
    }
  }
  return r;
}

/** Delete an abandoned order while it is still pending (items cascade). */
export async function cleanupExpiredCheckout(orderId: string): Promise<{ deleted: boolean }> {
  return cleanupExpiredOrder(
    {
      async deletePendingOrder(id) {
        const { data } = await supabaseAdmin
          .from('orders')
          .delete()
          .eq('id', id)
          .eq('status', 'pending')
          .select('id');
        return !!(data && data.length > 0);
      },
    },
    orderId,
  );
}
