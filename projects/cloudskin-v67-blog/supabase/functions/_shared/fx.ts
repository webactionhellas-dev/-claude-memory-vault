// CloudSkin checkout, FX conversion (PURE, dependency-free).
// Only used by the OPTIONAL "manual" presentment mode, where the Checkout Session
// currency is set to the customer's selected currency and we convert amounts
// ourselves. The DEFAULT mode is "adaptive" (Stripe owns conversion) and does NOT
// use this file at all. Kept pure + injected-rates so it is unit-tested with no
// network (tests/fx.test.ts) and never invents a rate: the caller supplies the
// rate table (a live source via env FX_RATES_URL, or the documented static
// fallback that mirrors the site's display table so charge ~= displayed price).

import { fromMinorUnits, toMinorUnits, normalizeCurrency } from './money.ts';

// Rates are "units of CUR per 1 REFERENCE unit". The site's table is EUR-based
// (rates.EUR === 1), so any base->target conversion is rate[target] / rate[base].
export type RateTable = Record<string, number>;

export interface ConvertResult {
  ok: boolean;
  targetMinor: number;      // amount in minor units of targetCurrency
  targetCurrency: string;   // lower-case ISO
  effectiveRate: number;    // base->target rate actually applied (incl. any fee)
  reason?: string;          // set when ok === false
}

function rateFor(currency: string, rates: RateTable): number | null {
  const up = String(currency || '').toUpperCase();
  const r = rates?.[up];
  return typeof r === 'number' && isFinite(r) && r > 0 ? r : null;
}

/**
 * Convert a base-currency minor amount to a target-currency minor amount using
 * an injected EUR-referenced rate table.
 *  - same currency short-circuits (no rounding drift),
 *  - a missing/invalid rate returns ok:false so the caller can fall back to
 *    adaptive mode or reject, rather than charging a wrong amount,
 *  - `feeBps` is an OPTIONAL owner-set FX buffer in basis points (default 0 =
 *    off). It is applied transparently and recorded; nothing is hidden or guessed.
 */
export function convertMinor(
  baseMinor: number,
  baseCurrency: string,
  targetCurrency: string,
  rates: RateTable,
  feeBps = 0,
): ConvertResult {
  const base = normalizeCurrency(baseCurrency);
  const target = normalizeCurrency(targetCurrency);

  if (base === target) {
    return { ok: true, targetMinor: Math.round(baseMinor), targetCurrency: target, effectiveRate: 1 };
  }

  const rBase = rateFor(base, rates);
  const rTarget = rateFor(target, rates);
  if (rBase === null || rTarget === null) {
    return {
      ok: false, targetMinor: 0, targetCurrency: target, effectiveRate: 0,
      reason: `missing FX rate for ${rBase === null ? base : target}`,
    };
  }

  const feeMult = 1 + Math.max(0, feeBps) / 10000;
  const effectiveRate = (rTarget / rBase) * feeMult;
  const baseMajor = fromMinorUnits(baseMinor, base);
  const targetMajor = baseMajor * effectiveRate;
  return {
    ok: true,
    targetMinor: toMinorUnits(targetMajor, target),
    targetCurrency: target,
    effectiveRate,
  };
}
