// Unit tests for the shared Stripe session-params assembler (_shared/session-params.ts).
// buildSessionParams() is THE anti-drift seam: create-checkout-session (hosted) and
// create-checkout-elements (embedded) both build from it, so they can never disagree
// on the amount, the single shipping option, promo enablement, or customer pinning.
// These tests are the guard that the refactor stayed behaviour-preserving.
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionParams, type SessionContext } from '../supabase/functions/_shared/session-params.ts';
import { SHIP_COUNTRIES } from '../supabase/functions/_shared/shipping.ts';

function ctxGuest(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    orderId: 'order-uuid-1',
    displayItems: [
      { shopify_variant_id: 'gid://shopify/ProductVariant/1', product_handle: 'court-skirt', title: 'Court Skirt', variant_title: 'Black', size: 'M', unit_price_cents: 32800, currency: 'aed', quantity: 2, country_of_origin: 'CN' },
      { shopify_variant_id: 'gid://shopify/ProductVariant/2', product_handle: 'court-bra', title: 'Court Bra', variant_title: 'White', size: 'S', unit_price_cents: 18000, currency: 'aed', quantity: 1, country_of_origin: 'CN' },
    ],
    sessionCurrency: 'aed',
    baseCurrency: 'aed',
    presentmentMode: 'adaptive',
    shipMinorSession: 7100,
    shipMinorBase: 7100,
    shippingIsFree: false,
    existingCustomerId: null,
    email: 'shopper@example.com',
    ...overrides,
  };
}

test('hosted and elements sessions differ ONLY in ui_mode + redirect fields', () => {
  const ctx = ctxGuest();
  const hosted = buildSessionParams({ uiMode: 'hosted', ctx, lang: 'en', successUrl: 'https://x/s', cancelUrl: 'https://x/c' });
  const elements = buildSessionParams({ uiMode: 'elements', ctx, lang: 'en', returnUrl: 'https://x/r' });

  // Strip the fields that are ALLOWED to differ, plus metadata.ui_mode (observability).
  const strip = (p: Record<string, unknown>) => {
    const clone: Record<string, unknown> = JSON.parse(JSON.stringify(p));
    delete clone.ui_mode;
    delete clone.success_url;
    delete clone.cancel_url;
    delete clone.return_url;
    if (clone.metadata && typeof clone.metadata === 'object') delete (clone.metadata as Record<string, unknown>).ui_mode;
    return clone;
  };
  assert.deepEqual(strip(hosted), strip(elements), 'money-bearing params must be identical across rails');

  // And the differences are exactly what we expect.
  assert.equal(hosted.ui_mode, undefined, 'hosted omits ui_mode (Stripe default)');
  assert.equal(elements.ui_mode, 'elements');
  assert.equal(hosted.success_url, 'https://x/s');
  assert.equal(hosted.cancel_url, 'https://x/c');
  assert.equal(elements.return_url, 'https://x/r');
  assert.equal(elements.success_url, undefined);
});

test('line item amounts come straight from displayItems (server-authoritative)', () => {
  const p = buildSessionParams({ uiMode: 'elements', ctx: ctxGuest(), lang: 'en', returnUrl: 'https://x/r' });
  const li = p.line_items as any[];
  assert.equal(li.length, 2);
  assert.equal(li[0].price_data.unit_amount, 32800);
  assert.equal(li[0].price_data.currency, 'aed');
  assert.equal(li[0].quantity, 2);
  assert.equal(li[0].price_data.product_data.name, 'Court Skirt');
  assert.equal(li[0].price_data.product_data.description, 'Black | M');
  assert.equal(li[1].price_data.unit_amount, 18000);
});

test('shipping is the ONE server-decided option; label reflects free vs flat', () => {
  const flat = buildSessionParams({ uiMode: 'elements', ctx: ctxGuest({ shipMinorSession: 7100, shippingIsFree: false }), lang: 'en' });
  const so = (flat.shipping_options as any[])[0].shipping_rate_data;
  assert.equal((flat.shipping_options as any[]).length, 1);
  assert.equal(so.fixed_amount.amount, 7100);
  assert.equal(so.fixed_amount.currency, 'aed');
  assert.equal(so.display_name, 'Standard shipping');

  const free = buildSessionParams({ uiMode: 'elements', ctx: ctxGuest({ shipMinorSession: 0, shippingIsFree: true }), lang: 'en' });
  const soFree = (free.shipping_options as any[])[0].shipping_rate_data;
  assert.equal(soFree.fixed_amount.amount, 0);
  assert.equal(soFree.display_name, 'Complimentary shipping');
});

test('guest checkout pins by customer_email; returning customer pins by customer id', () => {
  const guest = buildSessionParams({ uiMode: 'elements', ctx: ctxGuest(), lang: 'en' });
  assert.equal(guest.customer_email, 'shopper@example.com');
  assert.equal(guest.customer, undefined);

  const returning = buildSessionParams({ uiMode: 'elements', ctx: ctxGuest({ existingCustomerId: 'cus_123' }), lang: 'en' });
  assert.equal(returning.customer, 'cus_123');
  assert.equal(returning.customer_email, undefined, 'Stripe rejects customer + customer_email together');
  assert.deepEqual(returning.customer_update, { shipping: 'auto', address: 'auto' });
});

test('promo, DDP tax, and order metadata are always set', () => {
  const p = buildSessionParams({ uiMode: 'elements', ctx: ctxGuest({ shipMinorBase: 7100, shippingIsFree: false }), lang: 'el' });
  assert.equal(p.allow_promotion_codes, true, 'WELCOME10 must be redeemable');
  assert.deepEqual(p.automatic_tax, { enabled: false }, 'prices are duties/tax-inclusive (DDP)');
  const meta = p.metadata as Record<string, unknown>;
  assert.equal(meta.order_id, 'order-uuid-1');
  assert.equal(meta.shipping_base_minor, '7100');
  assert.equal(meta.shipping_free, '0');
  assert.equal(meta.lang, 'el');
  const pi = p.payment_intent_data as any;
  assert.equal(pi.metadata.order_id, 'order-uuid-1', 'webhook keys off payment_intent metadata too');
});

test('ship-to allowlist is deduped and matches SHIP_COUNTRIES', () => {
  const p = buildSessionParams({ uiMode: 'elements', ctx: ctxGuest(), lang: 'en' });
  const allowed = (p.shipping_address_collection as any).allowed_countries as string[];
  assert.deepEqual(allowed, [...new Set(SHIP_COUNTRIES)]);
  assert.ok(allowed.includes('AE'));
  assert.equal(allowed.length, new Set(allowed).size, 'no duplicate countries');
});
