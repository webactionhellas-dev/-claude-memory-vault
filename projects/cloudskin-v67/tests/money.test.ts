// Unit tests for Stripe minor-unit math (_shared/money.ts).
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  currencyExponent, toMinorUnits, fromMinorUnits, normalizeCurrency,
} from '../supabase/functions/_shared/money.ts';

test('currency exponents follow Stripe (0 / 2 / 3 decimal)', () => {
  assert.equal(currencyExponent('EUR'), 2);
  assert.equal(currencyExponent('aed'), 2); // case-insensitive
  assert.equal(currencyExponent('USD'), 2);
  assert.equal(currencyExponent('JPY'), 0); // zero-decimal
  assert.equal(currencyExponent('KRW'), 0);
  assert.equal(currencyExponent('KWD'), 3); // three-decimal
  assert.equal(currencyExponent('BHD'), 3);
});

test('toMinorUnits: 2-decimal currencies multiply by 100', () => {
  assert.equal(toMinorUnits(68, 'EUR'), 6800);
  assert.equal(toMinorUnits(199.99, 'EUR'), 19999);
  assert.equal(toMinorUnits(285.6, 'AED'), 28560);
});

test('toMinorUnits: zero-decimal currencies do not multiply', () => {
  assert.equal(toMinorUnits(1500, 'JPY'), 1500);
  assert.equal(toMinorUnits(1500.4, 'JPY'), 1500);
});

test('toMinorUnits: three-decimal currencies round to a multiple of 10', () => {
  // 1.5 KWD -> 1500 minor, already a multiple of 10
  assert.equal(toMinorUnits(1.5, 'KWD'), 1500);
  // 1.234 KWD -> 1234 -> nearest 10 -> 1230
  assert.equal(toMinorUnits(1.234, 'KWD'), 1230);
  assert.equal(toMinorUnits(1.236, 'KWD'), 1240);
  // single-step round: 1234.6 minor -> nearest 10 is 1230 (a two-step round wrongly gives 1240)
  assert.equal(toMinorUnits(1.2346, 'KWD'), 1230);
  // FX-converted value (5.07 EUR at 0.354) -> 1794.78 -> 1790
  assert.equal(toMinorUnits(1.79478, 'KWD'), 1790);
});

test('fromMinorUnits inverts toMinorUnits for 2-decimal', () => {
  assert.equal(fromMinorUnits(6800, 'EUR'), 68);
  assert.equal(fromMinorUnits(1500, 'JPY'), 1500);
});

test('normalizeCurrency lower-cases valid ISO and falls back otherwise', () => {
  assert.equal(normalizeCurrency('EUR'), 'eur');
  assert.equal(normalizeCurrency(' AeD '), 'aed');
  assert.equal(normalizeCurrency('', 'eur'), 'eur');
  assert.equal(normalizeCurrency('bogus', 'usd'), 'usd');
});
