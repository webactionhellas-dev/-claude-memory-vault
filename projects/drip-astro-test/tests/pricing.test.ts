// Money-path unit tests for the checkout pricing seam (src/lib/pricing.ts).
// Run with: npm test   (Node's built-in runner; native TS, no extra deps.)
// These guard the single most important security property of the store: the
// SERVER decides the price, and a tampered client payload cannot change it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceCart, clampQty, MAX_QTY } from '../src/lib/pricing.ts';
import type { Product } from '../src/lib/products.ts';

// Minimal catalog — priceCart only reads slug/name/brand/price.
const p = (slug: string, price: number): Product =>
  ({ slug, name: slug.toUpperCase(), brand: 'DRIP', price } as unknown as Product);
// Real-shaped DRIP prices, including a grail well above the slider cap.
const CATALOG: Product[] = [p('air-jordan-1-chicago', 1200), p('samba-og', 110), p('dunk-low-panda', 129.99)];

test('client-sent price is IGNORED, server re-prices from the catalog', () => {
  // Attacker sends price: 1 (wants to pay 1 euro) for a 1200 euro grail.
  const { items, subtotalCents } = priceCart(CATALOG, [
    { slug: 'air-jordan-1-chicago', qty: 1, price: 1 } as any,
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].unit_price_cents, 120000); // server price, not the client's 1
  assert.equal(subtotalCents, 120000);
});

test('unknown slugs are dropped, not priced at zero', () => {
  const { items, subtotalCents } = priceCart(CATALOG, [
    { slug: 'counterfeit-yeezy', qty: 3 },
    { slug: 'samba-og', qty: 2 },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].product_slug, 'samba-og');
  assert.equal(subtotalCents, 22000); // 110 * 2
});

test('quantity is clamped to [1, MAX_QTY]', () => {
  assert.equal(clampQty(0), 1);
  assert.equal(clampQty(-5), 1);
  assert.equal(clampQty(999), MAX_QTY);
  assert.equal(clampQty(undefined), 1);
  assert.equal(clampQty('3'), 3);
  const { items } = priceCart(CATALOG, [{ slug: 'air-jordan-1-chicago', qty: 999 }]);
  assert.equal(items[0].quantity, MAX_QTY);
});

test('price is rounded to whole cents (no float drift)', () => {
  const { items, subtotalCents } = priceCart(CATALOG, [{ slug: 'dunk-low-panda', qty: 3 }]);
  assert.equal(items[0].unit_price_cents, 12999); // 129.99 -> 12999, not 12998.999...
  assert.equal(subtotalCents, 38997);
});

test('subtotal sums server prices across mixed lines', () => {
  const { subtotalCents } = priceCart(CATALOG, [
    { slug: 'air-jordan-1-chicago', qty: 2 }, // 240000
    { slug: 'samba-og', qty: 1 }, // 11000
  ]);
  assert.equal(subtotalCents, 251000);
});

test('missing size defaults to OS; image must be a string', () => {
  const { items } = priceCart(CATALOG, [{ slug: 'samba-og', qty: 1, image: 42 as any }]);
  assert.equal(items[0].size, 'OS');
  assert.equal(items[0].image, ''); // non-string image coerced to empty, never trusted
});

test('empty cart yields no items and a zero subtotal', () => {
  const { items, subtotalCents } = priceCart(CATALOG, []);
  assert.equal(items.length, 0);
  assert.equal(subtotalCents, 0);
});

test('3DS is requested at and above 500 euros, not below', async () => {
  const { needsStrongAuth, THREE_DS_THRESHOLD_CENTS } = await import('../src/lib/pricing.ts');
  assert.equal(THREE_DS_THRESHOLD_CENTS, 50000);
  assert.equal(needsStrongAuth(49999), false);
  assert.equal(needsStrongAuth(50000), true);
  assert.equal(needsStrongAuth(120000), true);
});
