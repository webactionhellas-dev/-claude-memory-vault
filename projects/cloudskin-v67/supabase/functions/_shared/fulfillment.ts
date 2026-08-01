// CloudSkin checkout, POST-PAYMENT fulfilment (Deno edge runtime).
// ----------------------------------------------------------------------------
// THE single code path every payment rail calls after a payment is confirmed.
// stripe-webhook's markPaidAndSync and the PayPal capture/webhook handlers all
// call fulfillPaidOrder() instead of each hand-rolling their own shipping-major
// recovery + createShopifyOrder call. This is the concrete fix for the drift bug
// documented in _shared/shopify.ts's header: two copies of the Shopify-order
// logic silently disagreeing about shipping. There is now exactly one copy, and
// it lives here.
//
// Contract: the CALLER must have ALREADY atomically flipped the order row to
// status='paid' (the `.eq('status','pending')` / `.neq('status','paid')` guard
// lives in the caller, not here, because each rail's atomic-flip UPDATE also
// needs to set rail-specific columns in the same statement). This function only
// does the idempotent-safe-to-repeat part: read the row back, push to Shopify,
// record the sync result. Never throws (a Shopify outage must not lose a paid
// sale) — failures are recorded on the row for backfill via
// shopify_sync_status in ('skipped','failed').

import { serviceClient, getSecret } from './env.ts';
import { createShopifyOrder, type PaymentProvider } from './shopify.ts';
import { fromMinorUnits } from './money.ts';

export interface FulfillInput {
  orderId: string;                  // our stripe_orders.id (uuid) — the shared payment-orders ledger
  email: string | null;
  shipping: any;
  lang?: string;
  provider: PaymentProvider;
  stripeSessionId?: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
}

export async function fulfillPaidOrder(input: FulfillInput): Promise<void> {
  const supabase = serviceClient();

  const { data: order, error: orderErr } = await supabase
    .from('stripe_orders')
    .select('base_currency, base_total_cents, base_subtotal_cents')
    .eq('id', input.orderId)
    .maybeSingle();
  if (orderErr || !order) {
    console.error(`[fulfillment] order ${input.orderId} not found:`, orderErr?.message);
    return;
  }

  const { data: items } = await supabase
    .from('stripe_order_items')
    .select('shopify_variant_id, quantity')
    .eq('order_id', input.orderId);

  const lineItems = (items ?? [])
    .filter((it) => it.shopify_variant_id)
    .map((it) => ({ variantId: it.shopify_variant_id as string, quantity: it.quantity as number }));

  const baseCur = order.base_currency ?? 'aed';
  // Shipping was folded into base_total_cents at checkout time (both rails do
  // this the SAME way, see _shared/shipping.ts); base_subtotal_cents is
  // goods-only. Recover the shipping delta so the Shopify order carries a
  // matching shipping_line and its total reconciles with what was captured.
  const shippingMinor = (order.base_total_cents ?? 0) - (order.base_subtotal_cents ?? order.base_total_cents ?? 0);
  const shippingMajor = fromMinorUnits(shippingMinor > 0 ? shippingMinor : 0, baseCur);

  const adminToken = await getSecret('SHOPIFY_ADMIN_TOKEN');
  const result = await createShopifyOrder(
    {
      email: input.email ?? '',
      currency: baseCur,
      totalMajor: fromMinorUnits(order.base_total_cents ?? 0, baseCur),
      shippingMajor,
      lineItems,
      shipping: input.shipping,
      lang: input.lang,
      stripeOrderId: input.orderId,
      stripeSessionId: input.stripeSessionId,
      provider: input.provider,
      paypalOrderId: input.paypalOrderId,
      paypalCaptureId: input.paypalCaptureId,
    },
    adminToken,
  );

  await supabase.from('stripe_orders').update({
    shopify_sync_status: result.status,
    shopify_order_id: result.shopifyOrderId ?? null,
    shopify_sync_error: result.error ?? null,
  }).eq('id', input.orderId);

  if (result.status === 'failed') {
    console.error(`[fulfillment] Shopify sync failed for order ${input.orderId} (${input.provider}):`, result.error);
  }
}
