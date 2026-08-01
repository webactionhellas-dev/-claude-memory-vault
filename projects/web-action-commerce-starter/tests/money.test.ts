// Formatting-path tests for lib/money.ts (display only, but wrong money display
// erodes trust fast). Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money, discountPct } from '../src/lib/money.ts';

test('money() formats EUR with no decimals', () => {
  const out = money(220);
  assert.match(out, /220/);
  assert.match(out, /€/);
  assert.doesNotMatch(out, /\.\d/); // maximumFractionDigits: 0
});

test('discountPct computes a rounded percentage when on sale', () => {
  assert.equal(discountPct(150, 200), 25);
  assert.equal(discountPct(120, 160), 25);
});

test('discountPct is 0 when there is no valid markdown', () => {
  assert.equal(discountPct(200, null), 0);
  assert.equal(discountPct(200, undefined), 0);
  assert.equal(discountPct(200, 150), 0); // compareAt below price is not a discount
  assert.equal(discountPct(200, 200), 0);
});
