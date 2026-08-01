// CloudSkin checkout, PayPal verify + capture + fulfil orchestration (Deno edge runtime).
// ----------------------------------------------------------------------------
// ONE function that BOTH capture-paypal-order (the synchronous onApprove call
// from the browser) and paypal-webhook (the async safety net, PAYMENT.CAPTURE.
// COMPLETED / CHECKOUT.ORDER.APPROVED) call. Whichever fires first does the
// work; the DB's atomic `.eq('status','pending')` guard means the second caller
// always finds the order already paid and does nothing further. This mirrors
// _shared/fulfillment.ts's role for the payment-agnostic Shopify-order step —
// together they are the reason capture-paypal-order and paypal-webhook do not
// each hand-roll their own copy of "is this safe to capture, and once captured,
// how do we record + fulfil it."
//
// Defense in depth before capturing (never trust a client-supplied id blindly):
//   1) the PayPal order id must match a row WE created (payment_provider='paypal'),
//   2) re-fetch the order FROM PayPal and cross-check its amount against what we
//      recorded at creation time (catches an id-confusion bug; PayPal order
//      amounts are already fixed server-side at creation, so this is a sanity
//      check, not the primary control),
//   3) validate the buyer's shipping country against the SAME SHIP_COUNTRIES
//      allowlist Stripe Checkout enforces (_shared/shipping.ts) — PayPal has no
//      per-order "allowed countries" parameter, so it is enforced here, BEFORE
//      capturing (no charge is attempted for a country CloudSkin does not ship to).

import { serviceClient } from './env.ts';
import { toMinorUnits } from './money.ts';
import { isShippableCountry } from './shipping.ts';
import { getPayPalOrder, capturePayPalOrder } from './paypal.ts';
import { fulfillPaidOrder } from './fulfillment.ts';

export interface CompleteResult {
  ok: boolean;
  status: 'paid' | 'pending' | 'already_paid' | 'error';
  error?: string;
  httpStatus: number;
}

/** Normalize a PayPal shipping node into the same {name,phone,address:{...}}
 *  shape _shared/shopify.ts's mapShippingAddress() already expects from Stripe. */
function normalizePaypalShipping(ppOrder: any): any {
  const su = ppOrder?.purchase_units?.[0];
  const s = su?.shipping;
  if (!s) return null;
  const a = s.address || {};
  return {
    name: s.name?.full_name || '',
    phone: ppOrder?.payer?.phone?.phone_number?.national_number || null,
    address: {
      line1: a.address_line_1 || '',
      line2: a.address_line_2 || '',
      city: a.admin_area_2 || '',
      state: a.admin_area_1 || '',
      postal_code: a.postal_code || '',
      country: a.country_code || '',
    },
  };
}

export async function completePayPalOrder(paypalOrderId: string): Promise<CompleteResult> {
  const supabase = serviceClient();

  const { data: row, error: rowErr } = await supabase
    .from('stripe_orders')
    .select('id, status, email, metadata')
    .eq('paypal_order_id', paypalOrderId)
    .eq('payment_provider', 'paypal')
    .maybeSingle();
  if (rowErr || !row) return { ok: false, status: 'error', error: 'Order not found.', httpStatus: 404 };
  if (row.status === 'paid') return { ok: true, status: 'already_paid', httpStatus: 200 };
  if (row.status !== 'pending') return { ok: false, status: 'error', error: `Order is ${row.status}, cannot capture.`, httpStatus: 409 };

  const ppOrder = await getPayPalOrder(paypalOrderId);
  if (!ppOrder.ok || !ppOrder.raw) {
    return { ok: false, status: 'error', error: 'Could not verify the payment with PayPal.', httpStatus: 502 };
  }

  const su = ppOrder.raw.purchase_units?.[0];
  const expectedValue = row.metadata?.paypal_total_value;
  if (expectedValue && su?.amount?.value && String(su.amount.value) !== String(expectedValue)) {
    console.error(`[paypal] amount mismatch for order ${row.id}: expected ${expectedValue}, PayPal has ${su.amount.value}`);
    return { ok: false, status: 'error', error: 'Order amount could not be verified. Please contact support.', httpStatus: 409 };
  }

  const countryCode = su?.shipping?.address?.country_code;
  if (!isShippableCountry(countryCode)) {
    return { ok: false, status: 'error', error: `Sorry, CloudSkin does not currently ship to ${countryCode || 'that address'}.`, httpStatus: 422 };
  }

  if (ppOrder.raw.status !== 'APPROVED' && ppOrder.raw.status !== 'COMPLETED') {
    return { ok: false, status: 'pending', error: 'Payment has not been approved yet.', httpStatus: 409 };
  }

  // Already captured on PayPal's side (e.g. the webhook or a retried client
  // call already did it) -> skip straight to the fulfil step below.
  let captureNode = su?.payments?.captures?.[0];
  if (ppOrder.raw.status !== 'COMPLETED') {
    const capture = await capturePayPalOrder(paypalOrderId, `paypal-capture-${row.id}`);
    if (!capture.ok) {
      console.error(`[paypal] capture failed for order ${row.id}:`, capture.error);
      return { ok: false, status: 'error', error: 'Payment could not be completed. Please try again.', httpStatus: 502 };
    }
    captureNode = capture.raw?.purchase_units?.[0]?.payments?.captures?.[0];
    if (capture.raw?.status && capture.raw.status !== 'COMPLETED') {
      // e.g. PENDING (rare, some funding sources) — do not mark paid yet; a
      // later PAYMENT.CAPTURE.COMPLETED webhook will complete this.
      return { ok: true, status: 'pending', httpStatus: 202 };
    }
  }
  if (!captureNode || captureNode.status !== 'COMPLETED') {
    return { ok: false, status: 'error', error: 'Payment could not be confirmed.', httpStatus: 502 };
  }

  const captureId = captureNode.id as string;
  const email = ppOrder.raw.payer?.email_address ?? row.email ?? null;
  const shipping = normalizePaypalShipping(ppOrder.raw);
  const presentmentCurrency = String(captureNode.amount?.currency_code ?? '').toLowerCase() || null;
  const presentmentTotalCents = presentmentCurrency
    ? toMinorUnits(Number(captureNode.amount?.value ?? 0), presentmentCurrency)
    : null;

  // --- atomic pending -> paid (SAME guard shape as Stripe's markPaidAndSync) ---
  const { data: flipped, error: flipErr } = await supabase
    .from('stripe_orders')
    .update({
      status: 'paid',
      paypal_capture_id: captureId,
      email,
      shipping,
      presentment_currency: presentmentCurrency,
      presentment_total_cents: presentmentTotalCents,
    })
    .eq('id', row.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (flipErr) {
    console.error(`[paypal] paid-flip failed for order ${row.id}:`, flipErr.message);
    return { ok: false, status: 'error', error: 'Payment captured but recording it failed; support has been notified.', httpStatus: 500 };
  }
  if (!flipped) return { ok: true, status: 'already_paid', httpStatus: 200 }; // lost the race to a concurrent caller

  await fulfillPaidOrder({
    orderId: row.id,
    email,
    shipping,
    lang: row.metadata?.lang,
    provider: 'paypal',
    paypalOrderId,
    paypalCaptureId: captureId,
  });
  return { ok: true, status: 'paid', httpStatus: 200 };
}
