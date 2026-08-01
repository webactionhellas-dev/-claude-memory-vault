// Unit tests for the manual-mode FX seam (_shared/fx.ts).
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertMinor } from '../supabase/functions/_shared/fx.ts';

// EUR-referenced table (units per 1 EUR), mirroring the site's display table.
const RATES = { EUR: 1, USD: 1.14, AED: 4.2, GBP: 0.849, KWD: 0.354, JPY: 170 };

test('same currency short-circuits with rate 1 and no drift', () => {
  const r = convertMinor(6800, 'eur', 'EUR', RATES);
  assert.equal(r.ok, true);
  assert.equal(r.targetMinor, 6800);
  assert.equal(r.effectiveRate, 1);
});

test('EUR base converts to AED (2-decimal target)', () => {
  // 68.00 EUR -> 68 * 4.2 = 285.60 AED -> 28560 minor
  const r = convertMinor(6800, 'eur', 'aed', RATES);
  assert.equal(r.ok, true);
  assert.equal(r.targetMinor, 28560);
  assert.equal(r.effectiveRate, 4.2);
});

test('EUR base converts to USD', () => {
  // 68.00 EUR -> 77.52 USD -> 7752 minor
  const r = convertMinor(6800, 'eur', 'usd', RATES);
  assert.equal(r.targetMinor, 7752);
});

test('non-EUR base uses rate[target]/rate[base]', () => {
  // base AED 285.60 (28560 minor) -> EUR: 285.6 / 4.2 = 68.00 -> 6800 minor
  const r = convertMinor(28560, 'aed', 'eur', RATES);
  assert.equal(r.targetMinor, 6800);
});

test('missing rate returns ok:false so the caller can fall back or reject', () => {
  const r = convertMinor(6800, 'eur', 'zzz', RATES);
  assert.equal(r.ok, false);
  assert.match(r.reason ?? '', /missing FX rate/);
});

test('optional feeBps applies a transparent buffer', () => {
  // 200 bps = 2% on top of the 4.2 rate -> 4.284
  const r = convertMinor(6800, 'eur', 'aed', RATES, 200);
  assert.ok(Math.abs(r.effectiveRate - 4.284) < 1e-9);
  // 68 * 4.284 = 291.312 -> 29131 minor
  assert.equal(r.targetMinor, 29131);
});
