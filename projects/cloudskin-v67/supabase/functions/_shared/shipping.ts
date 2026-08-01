// CloudSkin checkout, shipping math (PURE, dependency-free — no Deno import, so
// it runs under both Deno edge functions AND `node --test` like money.ts/pricing.ts/fx.ts).
// ----------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for the "complimentary shipping over <threshold>" promise,
// shared by EVERY checkout rail (Stripe today, PayPal below, any future rail).
// This file exists specifically to prevent the class of bug the house already
// hit once: create-checkout-session and stripe-webhook shipped DIVERGENT copies
// of _shared/shopify.ts (one with shipping_lines, one without), so a Shopify
// order's total silently disagreed with what Stripe actually captured. See
// supabase/README.md "Deploy note (stripe-webhook _shared)" for the history.
// Every rail must import SHIP_DEFAULTS / SHIP_COUNTRIES / computeShipping from
// HERE, never redefine its own copy.
//
// Kept pure (env-var resolution happens in the CALLER, which can read Deno.env):
// this file takes the resolved threshold/flat-rate MAJOR amounts as arguments so
// it stays testable with zero mocking, exactly like money.ts/pricing.ts/fx.ts.

import { fromMinorUnits, toMinorUnits } from './money.ts';

// Free-shipping threshold + flat rate, in MAJOR units of the STORE BASE currency.
// Keyed by base currency so a re-base (EUR -> AED, as happened 2026-07-26) can
// never silently charge the wrong number. Overridable per-deploy via env
// FREE_SHIP_THRESHOLD_MAJOR / FLAT_SHIP_MAJOR (resolved by the caller). These
// MUST stay in step with the frontend threshold CLOUDSKIN.FREESHIP in js/config.js.
export const SHIP_DEFAULTS: Record<string, { free: number; flat: number }> = {
  aed: { free: 840, flat: 71 },
  eur: { free: 200, flat: 17 },
};

// Countries CloudSkin ships to (DDP). Both Stripe Checkout and the PayPal
// post-approval check validate against this SAME list so neither rail can be
// used to ship somewhere the other refuses.
export const SHIP_COUNTRIES = [
  'AE', 'SA', 'QA', 'BH', 'KW', 'OM', 'JO', 'LB', 'EG', 'IL', 'TR',
  'GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'GR', 'CY',
  'SE', 'DK', 'FI', 'NO', 'CH', 'PL', 'CZ', 'RO', 'HU',
  'US', 'CA', 'AU', 'NZ', 'JP', 'SG', 'HK', 'AE',
];

export interface ShippingResult {
  freeShipMajor: number;
  flatShipMajor: number;
  shippingIsFree: boolean;
  shipMinorBase: number; // minor units of baseCurrency
}

/**
 * Decide the shipping charge for a base-currency subtotal.
 *  - free at/above freeShipMajor (0 disables free shipping entirely),
 *  - otherwise the flat rate, converted to minor units of baseCurrency.
 * Pure: freeShipMajor/flatShipMajor are resolved by the caller (env override,
 * else SHIP_DEFAULTS[baseCurrency]) so this file never touches Deno.env.
 */
export function computeShipping(
  baseCurrency: string,
  subtotalCents: number,
  freeShipMajor: number,
  flatShipMajor: number,
): ShippingResult {
  const subtotalMajorBase = fromMinorUnits(subtotalCents, baseCurrency);
  const shippingIsFree = freeShipMajor > 0 && subtotalMajorBase >= freeShipMajor;
  const shipMinorBase = shippingIsFree ? 0 : toMinorUnits(flatShipMajor, baseCurrency);
  return { freeShipMajor, flatShipMajor, shippingIsFree, shipMinorBase };
}

/** True when an ISO-2 country code is on the CloudSkin ship-to allowlist. */
export function isShippableCountry(countryCode: string | null | undefined): boolean {
  const c = String(countryCode || '').trim().toUpperCase();
  return c.length === 2 && SHIP_COUNTRIES.includes(c);
}
