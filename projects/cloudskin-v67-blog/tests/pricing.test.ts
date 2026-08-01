// Money-path unit tests for the checkout pricing seam (_shared/pricing.ts).
// Run: node --test tests/    (Node 24 built-in runner; native TS, no install.)
// Guards the single most important security property of the store: the SERVER
// decides the price from Shopify-authoritative variants, and a tampered client
// payload cannot change it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceCart, clampQty, MAX_QTY } from '../supabase/functions/_shared/pricing.ts';
import type { CatalogVariant } from '../supabase/functions/_shared/pricing.ts';

const v = (id: string, priceMajor: number, extra: Partial<CatalogVariant> = {}): CatalogVariant => ({
  variantId: id, priceMajor, currency: 'EUR', title: id.toUpperCase(), handle: id, ...extra,
});

// Shopify GIDs, as the client would send them.
const TANK = 'gid://shopify/ProductVariant/111';
const SKIRT = 'gid://shopify/ProductVariant/222';
const GRAIL = 'gid://shopify/ProductVariant/333';
const CATALOG: CatalogVariant[] = [v(TANK, 68), v(SKIRT, 110), v(GRAIL, 199.99)];

test('client-sent price is IGNORED, server re-prices from the authoritative catalog', () => {
  // attacker sends price: 1 (wants to pay 1 EUR) for a 68 EUR tank
  const { items, subtotalCents } = priceCart(CATALOG, [
    { variantId: TANK, quantity: 1, price: 1 } as any,
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].unit_price_cents, 6800); // server price, not the client's 1
  assert.equal(subtotalCents, 6800);
});

test('unknown variant ids are dropped and counted, not priced at zero', () => {
  const { items, subtotalCents, dropped } = priceCart(CATALOG, [
    { variantId: 'gid://shopify/ProductVariant/999', quantity: 3 },
    { variantId: SKIRT, quantity: 2 },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].shopify_variant_id, SKIRT);
  assert.equal(subtotalCents, 22000); // 110 * 2
  assert.equal(dropped.unknown, 1);
});

test('out-of-stock variants (available === false) are dropped and counted', () => {
  const catalog = [v(TANK, 68, { available: false }), v(SKIRT, 110, { available: true })];
  const { items, dropped } = priceCart(catalog, [
    { variantId: TANK, quantity: 1 },
    { variantId: SKIRT, quantity: 1 },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].shopify_variant_id, SKIRT);
  assert.equal(dropped.unavailable, 1);
});

test('quantity is clamped to [1, MAX_QTY]', () => {
  assert.equal(clampQty(0), 1);
  assert.equal(clampQty(-5), 1);
  assert.equal(clampQty(999), MAX_QTY);
  assert.equal(clampQty(undefined), 1);
  assert.equal(clampQty('3'), 3);
  assert.equal(clampQty(2.9), 2);
  const { items } = priceCart(CATALOG, [{ variantId: TANK, quantity: 999 }]);
  assert.equal(items[0].quantity, MAX_QTY);
});

test('price is rounded to whole minor units (no float drift)', () => {
  const { items, subtotalCents } = priceCart(CATALOG, [{ variantId: GRAIL, quantity: 3 }]);
  assert.equal(items[0].unit_price_cents, 19999); // 199.99 -> 19999, not 19998.9999
  assert.equal(subtotalCents, 59997);
});

test('base currency is taken from the authoritative variant, not the client', () => {
  const catalog = [v(TANK, 68, { currency: 'AED' })];
  const { baseCurrency, items } = priceCart(catalog, [{ variantId: TANK, quantity: 1 }], 'eur');
  assert.equal(baseCurrency, 'aed');
  assert.equal(items[0].currency, 'aed');
  assert.equal(items[0].unit_price_cents, 6800); // AED is 2-decimal
});

test('empty / non-array cart yields no items and a zero subtotal', () => {
  assert.equal(priceCart(CATALOG, []).subtotalCents, 0);
  assert.equal(priceCart(CATALOG, null as any).items.length, 0);
});
