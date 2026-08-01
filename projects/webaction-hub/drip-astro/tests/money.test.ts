// Unit tests for the display-money helpers (src/lib/money.ts). Run with: npm test
// Formatting/discount math only — the authoritative cents math lives in
// pricing.ts and is covered by pricing.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money, discountPct } from '../src/lib/money.ts';

test('money() formats EUR with no decimals', () => {
  // en-IE EUR, maximumFractionDigits 0 -> "€1,200".
  assert.equal(money(1200), '€1,200');
  assert.equal(money(129.99), '€130'); // rounds for display
  assert.equal(money(0), '€0');
});

test('discountPct() computes the rounded percentage off', () => {
  assert.equal(discountPct(80, 100), 20);
  assert.equal(discountPct(129.99, 199.99), 35);
});

test('discountPct() is 0 when there is no genuine markdown', () => {
  assert.equal(discountPct(100, 100), 0); // equal
  assert.equal(discountPct(120, 100), 0); // compare-at below price (bad data)
  assert.equal(discountPct(100, null), 0); // no compare-at
  assert.equal(discountPct(100, undefined), 0);
});
