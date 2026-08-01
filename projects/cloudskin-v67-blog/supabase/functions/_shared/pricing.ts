// CloudSkin checkout, server-authoritative pricing (PURE, dependency-free).
// This is THE security seam for the money path: the browser sends Shopify
// variant ids + quantities, and the SERVER decides the price from authoritative
// variant prices it fetched itself (see _shared/shopify.ts, which re-fetches from
// the Storefront API). Any client-sent `price` is ignored entirely. Pure so it is
// unit-tested with no Stripe/Supabase/Deno (tests/pricing.test.ts).

import { toMinorUnits, normalizeCurrency } from './money.ts';

export const MAX_QTY = 10;

// What the browser sends per line. `price` may be present but is DELIBERATELY IGNORED.
export interface ClientLine {
  variantId: string;      // Shopify variant GID, e.g. "gid://shopify/ProductVariant/123"
  quantity?: number;
  size?: string;
  price?: number;         // IGNORED. Never trust the client on money.
}

// Authoritative variant, resolved server-side from Shopify (source of truth).
export interface CatalogVariant {
  variantId: string;
  priceMajor: number;     // major units in the store's base currency (e.g. 68.00)
  currency: string;       // ISO from Shopify (e.g. "EUR"/"AED"), authoritative base
  title?: string;         // product title (Shopify, never client-sent)
  variantTitle?: string;  // e.g. "White / M"
  handle?: string;
  size?: string;
  available?: boolean;    // false => known out of stock
  countryOfOrigin?: string | null; // DDP hook (config/metafield, pending from owner)
}

export interface PricedItem {
  shopify_variant_id: string;
  product_handle: string;
  title: string;
  variant_title: string;
  size: string;
  unit_price_cents: number; // minor units of `currency`
  currency: string;         // lower-case ISO base currency
  quantity: number;
  country_of_origin: string | null;
}

export interface PriceResult {
  items: PricedItem[];
  subtotalCents: number;    // minor units of baseCurrency
  baseCurrency: string;     // lower-case ISO
  dropped: { unknown: number; unavailable: number };
}

/** Clamp a client-supplied quantity to a sane [1, MAX_QTY] integer. */
export function clampQty(qty: unknown): number {
  return Math.max(1, Math.min(MAX_QTY, Math.floor(Number(qty) || 1)));
}

function toMap(catalog: CatalogVariant[] | Map<string, CatalogVariant>): Map<string, CatalogVariant> {
  if (catalog instanceof Map) return catalog;
  return new Map(catalog.map((v) => [v.variantId, v]));
}

/**
 * Re-price the cart from the authoritative catalog.
 *  - unit price comes ONLY from the catalog variant (client `price` ignored),
 *  - unknown variant ids are dropped (never priced at zero),
 *  - variants explicitly out of stock (available === false) are dropped,
 *  - quantity is clamped to [1, MAX_QTY],
 *  - amounts are converted to Stripe minor units for the base currency.
 * Base currency is taken from the authoritative variants (all share the store
 * currency); `defaultBaseCurrency` is only a fallback when the catalog is empty.
 */
export function priceCart(
  catalog: CatalogVariant[] | Map<string, CatalogVariant>,
  lines: ClientLine[],
  defaultBaseCurrency = 'eur',
): PriceResult {
  const byId = toMap(catalog);
  const items: PricedItem[] = [];
  let unknown = 0;
  let unavailable = 0;
  let baseCurrency = normalizeCurrency(defaultBaseCurrency);

  for (const l of Array.isArray(lines) ? lines : []) {
    const v = l && typeof l.variantId === 'string' ? byId.get(l.variantId) : undefined;
    if (!v) { unknown++; continue; }
    if (v.available === false) { unavailable++; continue; }

    const currency = normalizeCurrency(v.currency, defaultBaseCurrency);
    baseCurrency = currency; // authoritative base (all variants share it)

    items.push({
      shopify_variant_id: v.variantId,
      product_handle: v.handle ?? '',
      title: v.title ?? '',
      variant_title: v.variantTitle ?? '',
      size: String(l.size ?? v.size ?? ''),
      unit_price_cents: toMinorUnits(v.priceMajor, currency),
      currency,
      quantity: clampQty(l.quantity),
      country_of_origin: v.countryOfOrigin ?? null,
    });
  }

  const subtotalCents = items.reduce((s, it) => s + it.unit_price_cents * it.quantity, 0);
  return { items, subtotalCents, baseCurrency, dropped: { unknown, unavailable } };
}
