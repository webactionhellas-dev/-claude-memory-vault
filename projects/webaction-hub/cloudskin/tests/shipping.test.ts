// Unit tests for the shared shipping threshold math (_shared/shipping.ts).
// This is the SINGLE code path both create-checkout-session (Stripe) and
// create-paypal-order call, so a bug here would affect both rails identically —
// which is the point (no more per-rail drift).
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeShipping, isShippableCountry, SHIP_DEFAULTS, SHIP_COUNTRIES } from '../supabase/functions/_shared/shipping.ts';
import { toMinorUnits } from '../supabase/functions/_shared/money.ts';

test('AED: under threshold charges the flat rate', () => {
  const r = computeShipping('aed', toMinorUnits(328, 'aed'), SHIP_DEFAULTS.aed.free, SHIP_DEFAULTS.aed.flat);
  assert.equal(r.shippingIsFree, false);
  assert.equal(r.shipMinorBase, toMinorUnits(71, 'aed'));
});

test('AED: at/above threshold is complimentary', () => {
  const atThreshold = computeShipping('aed', toMinorUnits(840, 'aed'), SHIP_DEFAULTS.aed.free, SHIP_DEFAULTS.aed.flat);
  assert.equal(atThreshold.shippingIsFree, true);
  assert.equal(atThreshold.shipMinorBase, 0);

  const above = computeShipping('aed', toMinorUnits(984, 'aed'), SHIP_DEFAULTS.aed.free, SHIP_DEFAULTS.aed.flat);
  assert.equal(above.shippingIsFree, true);
  assert.equal(above.shipMinorBase, 0);
});

test('EUR: independent threshold/flat rate from AED', () => {
  const under = computeShipping('eur', toMinorUnits(150, 'eur'), SHIP_DEFAULTS.eur.free, SHIP_DEFAULTS.eur.flat);
  assert.equal(under.shippingIsFree, false);
  assert.equal(under.shipMinorBase, toMinorUnits(17, 'eur'));

  const over = computeShipping('eur', toMinorUnits(200, 'eur'), SHIP_DEFAULTS.eur.free, SHIP_DEFAULTS.eur.flat);
  assert.equal(over.shippingIsFree, true);
});

test('threshold of 0 disables free shipping entirely (always flat)', () => {
  const r = computeShipping('aed', toMinorUnits(999999, 'aed'), 0, 71);
  assert.equal(r.shippingIsFree, false);
  assert.equal(r.shipMinorBase, toMinorUnits(71, 'aed'));
});

test('env-style override values (caller-resolved) flow straight through', () => {
  // Simulates FREE_SHIP_THRESHOLD_MAJOR / FLAT_SHIP_MAJOR env overrides: the
  // caller resolves these (Deno.env), this pure function just uses whatever
  // it is given, so an override can never disagree between rails.
  const r = computeShipping('usd', toMinorUnits(50, 'usd'), 100, 9.5);
  assert.equal(r.shippingIsFree, false);
  assert.equal(r.shipMinorBase, toMinorUnits(9.5, 'usd'));
});

test('isShippableCountry matches the SHIP_COUNTRIES allowlist both rails share', () => {
  assert.equal(isShippableCountry('AE'), true);
  assert.equal(isShippableCountry('ae'), true); // case-insensitive
  assert.equal(isShippableCountry('US'), true);
  assert.equal(isShippableCountry('KP'), false); // not on the list
  assert.equal(isShippableCountry(''), false);
  assert.equal(isShippableCountry(null), false);
  assert.equal(isShippableCountry(undefined), false);
  assert.ok(SHIP_COUNTRIES.includes('AE'));
});
