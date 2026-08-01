// Money-path unit tests for the checkout pricing seam (lib/pricing.ts).
// Run with: npm test   (Node's built-in runner; native TS, no extra deps.)
// These guard the single most important security property of the store: the
// SERVER decides the price, and a tampered client payload cannot change it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceCart, clampQty, MAX_QTY } from '../src/lib/pricing.ts';
import type { Product } from '../src/lib/products.ts';

// minimal catalog, priceCart only reads slug/name/brand/price
const p = (slug: string, price: number): Product =>
  ({ slug, name: slug.toUpperCase(), brand: 'ACME', price } as unknown as Product);
const CATALOG: Product[] = [p('air-max', 220), p('samba', 110), p('grail', 199.99)];

test('client-sent price is IGNORED, server re-prices from the catalog', () => {
  // attacker sends price: 1 (wants to pay 1 euro) for a 220 euro shoe
  const { items, subtotalCents } = priceCart(CATALOG, [
    { slug: 'air-max', qty: 1, price: 1 } as any,
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].unit_price_cents, 22000); // server price, not the client's 1
  assert.equal(subtotalCents, 22000);
});

test('unknown slugs are dropped, not priced at zero', () => {
  const { items, subtotalCents } = priceCart(CATALOG, [
    { slug: 'does-not-exist', qty: 3 },
    { slug: 'samba', qty: 2 },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].product_slug, 'samba');
  assert.equal(subtotalCents, 22000); // 110 * 2
});

test('quantity is clamped to [1, MAX_QTY]', () => {
  assert.equal(clampQty(0), 1);
  assert.equal(clampQty(-5), 1);
  assert.equal(clampQty(999), MAX_QTY);
  assert.equal(clampQty(undefined), 1);
  assert.equal(clampQty('3'), 3);
  const { items } = priceCart(CATALOG, [{ slug: 'air-max', qty: 999 }]);
  assert.equal(items[0].quantity, MAX_QTY);
});

test('price is rounded to whole cents (no float drift)', () => {
  const { items, subtotalCents } = priceCart(CATALOG, [{ slug: 'grail', qty: 3 }]);
  assert.equal(items[0].unit_price_cents, 19999); // 199.99 -> 19999, not 19998.99999
  assert.equal(subtotalCents, 59997);
});

test('subtotal sums server prices across mixed lines', () => {
  const { subtotalCents } = priceCart(CATALOG, [
    { slug: 'air-max', qty: 2 }, // 44000
    { slug: 'samba', qty: 1 }, // 11000
  ]);
  assert.equal(subtotalCents, 55000);
});

test('empty cart yields no items and a zero subtotal', () => {
  const { items, subtotalCents } = priceCart(CATALOG, []);
  assert.equal(items.length, 0);
  assert.equal(subtotalCents, 0);
});
