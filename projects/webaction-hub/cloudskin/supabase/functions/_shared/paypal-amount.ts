// CloudSkin checkout, PayPal amount/breakdown math (PURE, dependency-free).
// ----------------------------------------------------------------------------
// PayPal's Orders v2 API requires amount.value to EXACTLY equal the sum of
// amount.breakdown (item_total + shipping [+ tax_total, unused here since prices
// are duties-inclusive and automatic_tax is off, mirroring Stripe]) and every
// figure must be a currency-correct decimal STRING (2dp for the currencies
// CloudSkin can settle PayPal in; PayPal supports no 0- or 3-decimal currency in
// its supported-currency list, unlike Stripe). Getting this wrong either makes
// PayPal reject the order (UNPROCESSABLE_ENTITY) or, worse, silently mismatches
// what Shopify records vs what PayPal captured (the exact "Bug A" class this
// house already hit once on the Stripe rail, see _shared/shipping.ts). This is
// unit-tested (tests/paypal-amount.test.ts) for exactly that reason.

import { fromMinorUnits, currencyExponent } from './money.ts';

// PayPal's REST API supported currencies (Orders v2 `currency_code`), verified
// against developer.paypal.com/reference/currency-codes/ 2026-07-28. Notably:
// NO AED, NO zero-decimal, NO three-decimal currencies — every one below is a
// standard 2-decimal ISO currency, so formatting is uniform (toFixed(2)).
export const PAYPAL_SUPPORTED_CURRENCIES = [
  'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS',
  'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'SGD',
  'SEK', 'CHF', 'THB', 'USD',
];

export function isPayPalSupportedCurrency(currency: string): boolean {
  return PAYPAL_SUPPORTED_CURRENCIES.includes(String(currency || '').toUpperCase());
}

/** Format minor units as the 2-decimal string PayPal's amount fields require. */
export function toPayPalAmountString(minor: number, currency: string): string {
  // PayPal currencies here are uniformly 2-decimal, but route through money.ts's
  // exponent table anyway so a future PayPal-supported 0-decimal currency (e.g.
  // JPY, HUF is NOT zero-decimal at PayPal despite being zero-decimal at Stripe —
  // PayPal has its OWN decimal rules, HUF/TWD are integer-only at PayPal) is not
  // silently mis-formatted. For the currencies CloudSkin actually uses (USD/EUR),
  // this is always 2dp.
  const exp = currencyExponent(currency) === 0 ? 0 : 2;
  return fromMinorUnits(minor, currency).toFixed(exp);
}

export interface PayPalLineItem {
  name: string;
  quantity: number;
  unitAmountMinor: number; // minor units of `currency`
}

export interface PayPalAmountBreakdown {
  currency_code: string;
  value: string;
  breakdown: {
    item_total: { currency_code: string; value: string };
    shipping: { currency_code: string; value: string };
  };
}

export interface PayPalItemNode {
  name: string;
  quantity: string;
  unit_amount: { currency_code: string; value: string };
}

/**
 * Build the PayPal purchase_unit `amount` (with breakdown) and `items[]` from
 * already-priced items (server-authoritative, from priceCart) + the resolved
 * shipping charge. value ALWAYS equals item_total + shipping by construction
 * (both derived from the same minor-unit sums), so PayPal can never reject the
 * order for an inconsistent breakdown, and Shopify's shipping_line (built from
 * the SAME shippingMinor via _shared/shipping.ts) can never disagree with what
 * PayPal captures.
 */
export function buildPayPalAmount(
  items: PayPalLineItem[],
  shippingMinor: number,
  currency: string,
): { amount: PayPalAmountBreakdown; items: PayPalItemNode[] } {
  const cur = String(currency || '').toUpperCase();
  const itemTotalMinor = items.reduce((s, it) => s + it.unitAmountMinor * it.quantity, 0);
  const totalMinor = itemTotalMinor + Math.max(0, shippingMinor);

  return {
    amount: {
      currency_code: cur,
      value: toPayPalAmountString(totalMinor, cur),
      breakdown: {
        item_total: { currency_code: cur, value: toPayPalAmountString(itemTotalMinor, cur) },
        shipping: { currency_code: cur, value: toPayPalAmountString(Math.max(0, shippingMinor), cur) },
      },
    },
    items: items.map((it) => ({
      name: (it.name || 'CloudSkin item').slice(0, 127), // PayPal item name max length
      quantity: String(it.quantity),
      unit_amount: { currency_code: cur, value: toPayPalAmountString(it.unitAmountMinor, cur) },
    })),
  };
}
