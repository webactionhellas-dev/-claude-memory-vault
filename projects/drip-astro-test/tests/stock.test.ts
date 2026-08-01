// Unit tests for the pre-flight stock validation seam (src/lib/stock.ts).
// Run with: npm test
//
// /api/checkout calls validateStock BEFORE creating the order or the Stripe
// session; a failing bag must yield a clean 409 with per-line detail (which the
// cart UI shows via data.error) and leave nothing behind to clean up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStock, unavailableMessage, type InventoryRow, type StockLine } from '../src/lib/stock.ts';

const ROWS: InventoryRow[] = [
  { product_slug: 'air-jordan-1-chicago', size: '43', quantity: 5 },
  { product_slug: 'air-jordan-1-chicago', size: '44', quantity: 0 },
  { product_slug: 'samba-og', size: '42', quantity: 2 },
];

const line = (slug: string, size: string, qty: number, name = slug.toUpperCase()): StockLine => ({
  product_slug: slug,
  name,
  size,
  quantity: qty,
});

test('in-stock bag passes', () => {
  const r = validateStock(ROWS, [line('air-jordan-1-chicago', '43', 2), line('samba-og', '42', 1)]);
  assert.equal(r.ok, true);
  assert.equal(r.unavailable.length, 0);
});

test('sold-out size (0 in stock) is rejected with available: 0', () => {
  const r = validateStock(ROWS, [line('air-jordan-1-chicago', '44', 1)]);
  assert.equal(r.ok, false);
  assert.deepEqual(r.unavailable, [
    { product_slug: 'air-jordan-1-chicago', name: 'AIR-JORDAN-1-CHICAGO', size: '44', requested: 1, available: 0 },
  ]);
});

test('partial stock (want 3, have 2) is rejected with the right detail', () => {
  const r = validateStock(ROWS, [line('samba-og', '42', 3)]);
  assert.equal(r.ok, false);
  assert.equal(r.unavailable[0].requested, 3);
  assert.equal(r.unavailable[0].available, 2);
});

test('a TRACKED product with no row for the requested size counts as 0', () => {
  // Matches the product page: stock[size] ?? 0 disables the button.
  const r = validateStock(ROWS, [line('samba-og', '99', 1)]);
  assert.equal(r.ok, false);
  assert.equal(r.unavailable[0].available, 0);
});

test('an UNTRACKED product (no inventory rows at all) is allowed', () => {
  // Matches /api/stock: tracked=false is treated as available.
  const r = validateStock(ROWS, [line('drip-logo-hoodie', 'L', 4)]);
  assert.equal(r.ok, true);
});

test('duplicate lines for the same slug+size are summed before comparing', () => {
  // 2 + 2 = 4 requested vs 2 available -> rejected even though each line alone fits.
  const r = validateStock(ROWS, [line('samba-og', '42', 2), line('samba-og', '42', 2)]);
  assert.equal(r.ok, false);
  assert.equal(r.unavailable[0].requested, 4);
  assert.equal(r.unavailable[0].available, 2);
});

test('one short line fails the whole bag, and only that line is reported', () => {
  const r = validateStock(ROWS, [line('air-jordan-1-chicago', '43', 1), line('samba-og', '42', 3)]);
  assert.equal(r.ok, false);
  assert.equal(r.unavailable.length, 1);
  assert.equal(r.unavailable[0].product_slug, 'samba-og');
});

test('unavailableMessage names each item: sold out vs only-N-left', () => {
  const msg = unavailableMessage([
    { product_slug: 'a', name: 'Jordan 1 Chicago', size: '44', requested: 1, available: 0 },
    { product_slug: 'b', name: 'Samba OG', size: '42', requested: 3, available: 2 },
  ]);
  assert.match(msg, /Jordan 1 Chicago \(size 44\) is sold out/);
  assert.match(msg, /Samba OG \(size 42\) has only 2 left/);
  assert.match(msg, /adjust your bag/);
});
