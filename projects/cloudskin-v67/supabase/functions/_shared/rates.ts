// CloudSkin checkout, FX rate SOURCE (Deno adapter — the network/env-reading half
// of _shared/fx.ts's pure convertMinor()). Hoisted out of create-checkout-session
// so create-paypal-order can use the EXACT SAME rate table (no second copy to
// drift out of sync, same reasoning as _shared/shipping.ts).
//
// STATIC_RATES mirrors js/i18n.js's display table so "charge ~= displayed price"
// holds even in the (currently unused by Stripe, but load-bearing for PayPal —
// see _shared/paypal-amount.ts) manual-conversion path. Rates are EUR-referenced
// ratios, so they stay correct whatever the store's base currency is (EUR or AED).

import { getConfig } from './env.ts';
import type { RateTable } from './fx.ts';

export const STATIC_RATES: RateTable = {
  EUR: 1, USD: 1.14, AUD: 1.63, AED: 4.2, GBP: 0.849,
  THB: 38.4, SEK: 11.05, RUB: 88, SAR: 4.28, KWD: 0.354,
};

/** Load the live rate table from FX_RATES_URL if configured, else the static fallback. */
export async function loadRates(): Promise<RateTable> {
  const url = getConfig('FX_RATES_URL');
  if (!url) return STATIC_RATES;
  try {
    const res = await fetch(url);
    if (!res.ok) return STATIC_RATES;
    const data = await res.json();
    const table: RateTable = data?.rates ?? data;
    if (table && typeof table.EUR === 'number') return table;
    return STATIC_RATES;
  } catch {
    return STATIC_RATES;
  }
}
