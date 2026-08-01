// CloudSkin checkout, money helpers (PURE, dependency-free).
// Shared by the edge functions (Deno) AND the unit tests (Node, `node --test`).
// No Deno or npm imports here so it stays instant and keyless to test.
//
// Stripe expects amounts in the SMALLEST currency unit ("minor units"). Most
// currencies are 2-decimal (x100). A fixed set are zero-decimal (no x100) and a
// set are three-decimal but must be charged in multiples of 10 minor units.
// Getting this wrong over/under-charges, so it is unit-tested (tests/money.test.ts).

// Stripe zero-decimal currencies (amount is the major unit, no multiplier).
const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

// Stripe three-decimal currencies (x1000, but the minor amount must be a
// multiple of 10, i.e. Stripe charges in whole "cents" of ten).
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

/** Number of decimal places Stripe uses for a currency (0, 2, or 3). */
export function currencyExponent(currency: string): number {
  const c = String(currency || '').toUpperCase();
  if (ZERO_DECIMAL.has(c)) return 0;
  if (THREE_DECIMAL.has(c)) return 3;
  return 2;
}

/**
 * Convert a major-unit amount (e.g. 328.00 AED) to Stripe minor units.
 * Three-decimal currencies are rounded to a multiple of 10 as Stripe requires.
 */
export function toMinorUnits(amountMajor: number, currency: string): number {
  const exp = currencyExponent(currency);
  if (exp === 3) {
    // Stripe requires 3-decimal amounts in multiples of 10 minor units. Round ONCE
    // to the nearest multiple of 10 from the un-rounded value; a two-step round
    // (to thousandths, then to tens) can cross an x.5 boundary and overcharge by 10.
    return Math.round(Number(amountMajor) * 100) * 10;
  }
  return Math.round(Number(amountMajor) * Math.pow(10, exp));
}

/** Convert Stripe minor units back to a major-unit number (for display/records). */
export function fromMinorUnits(amountMinor: number, currency: string): number {
  const exp = currencyExponent(currency);
  return Number(amountMinor) / Math.pow(10, exp);
}

/** Normalise a currency code to the lower-case ISO form Stripe expects on input. */
export function normalizeCurrency(currency: string, fallback = 'aed'): string {
  const c = String(currency || '').trim().toLowerCase();
  return /^[a-z]{3}$/.test(c) ? c : fallback;
}
