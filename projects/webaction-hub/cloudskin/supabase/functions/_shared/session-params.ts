// CloudSkin checkout, Stripe session-params assembler (PURE, dependency-free at
// runtime — imports only the pure SHIP_COUNTRIES list + a type). Kept in its own
// file (not inline in checkout-session.ts, which pulls Deno/npm/jsr imports) so it
// runs under `node --test` exactly like money.ts / shipping.ts / pricing.ts.
// ----------------------------------------------------------------------------
// THIS is the anti-drift seam for the two Stripe rails: create-checkout-session
// (hosted) and create-checkout-elements (embedded) both build their session from
// buildSessionParams(), so they can NEVER disagree on the amount, the single
// server-decided shipping option, promo enablement, customer pinning, or metadata.
// The ONLY differences are (1) ui_mode and (2) the redirect shape (success/cancel
// for hosted vs return_url for elements). Unit-tested in tests/checkout-session.test.ts.

import { SHIP_COUNTRIES } from './shipping.ts';
import type { PricedItem } from './pricing.ts';

// The money-bearing subset a session builder needs. The full CheckoutContext in
// checkout-session.ts is a superset (it also carries the supabase + stripe handles),
// but buildSessionParams only ever reads these fields.
export interface SessionContext {
  orderId: string;
  displayItems: PricedItem[];
  sessionCurrency: string;         // lower-case ISO
  baseCurrency: string;            // lower-case ISO (store base)
  presentmentMode: 'adaptive' | 'manual';
  shipMinorSession: number;        // minor units of sessionCurrency
  shipMinorBase: number;           // minor units of baseCurrency
  shippingIsFree: boolean;
  existingCustomerId: string | null;
  email: string | null;
}

export interface SessionParamsInput {
  uiMode: 'hosted' | 'elements';
  ctx: SessionContext;
  lang: string;
  // hosted
  successUrl?: string;
  cancelUrl?: string;
  // elements
  returnUrl?: string;
}

/**
 * PURE: assemble the Stripe Checkout Session create params from a context.
 * Every money-bearing field is identical across the two rails; only ui_mode and
 * the redirect fields differ. Returns a plain object (typed loosely on purpose so
 * this file needs no Stripe SDK import).
 */
export function buildSessionParams(input: SessionParamsInput): Record<string, unknown> {
  const { ctx, uiMode, lang } = input;
  const shippingLabel = ctx.shippingIsFree ? 'Complimentary shipping' : 'Standard shipping';

  const params: Record<string, unknown> = {
    mode: 'payment',
    line_items: ctx.displayItems.map((it) => ({
      quantity: it.quantity,
      price_data: {
        currency: ctx.sessionCurrency,
        unit_amount: it.unit_price_cents,
        product_data: {
          name: it.title || 'CloudSkin item',
          description: [it.variant_title, it.size].filter(Boolean).join(' | ') || undefined,
        },
      },
    })),
    // Existing customer (by email) -> pin the session so promotion restrictions see
    // history. Stripe rejects customer + customer_email together; an attached
    // customer needs customer_update consent to save the collected addresses.
    ...(ctx.existingCustomerId
      ? { customer: ctx.existingCustomerId, customer_update: { shipping: 'auto', address: 'auto' } }
      : { customer_email: ctx.email ?? undefined }),
    metadata: {
      order_id: ctx.orderId,
      presentment_mode: ctx.presentmentMode,
      base_currency: ctx.baseCurrency,
      shipping_base_minor: String(ctx.shipMinorBase),
      shipping_free: ctx.shippingIsFree ? '1' : '0',
      ui_mode: uiMode,
      lang,
    },
    payment_intent_data: { metadata: { order_id: ctx.orderId } },
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: true },
    shipping_address_collection: { allowed_countries: [...new Set(SHIP_COUNTRIES)] },
    // Exactly ONE option, decided server-side, so nobody can select a cheaper rate
    // than their cart qualifies for.
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: ctx.shipMinorSession, currency: ctx.sessionCurrency },
        display_name: shippingLabel,
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 2 },
          maximum: { unit: 'business_day', value: 6 },
        },
      },
    }],
    // Redeem WELCOME10. Mutually exclusive with `discounts`, so we use this one.
    allow_promotion_codes: true,
    automatic_tax: { enabled: false }, // prices are duties/tax-inclusive (DDP)
  };

  if (uiMode === 'elements') {
    params.ui_mode = 'elements';
    // return_url is where Stripe sends the buyer back after any redirect-based
    // method; card + wallets confirm inline. The webhook is the source of truth
    // for "paid", so this is purely navigational.
    if (input.returnUrl) params.return_url = input.returnUrl;
  } else {
    // hosted: ui_mode omitted (Stripe defaults to hosted), success/cancel urls.
    if (input.successUrl) params.success_url = input.successUrl;
    if (input.cancelUrl) params.cancel_url = input.cancelUrl;
  }

  return params;
}
