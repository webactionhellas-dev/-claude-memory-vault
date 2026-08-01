// CloudSkin checkout, Shopify integration (Deno edge runtime).
//  A) fetchVariantCatalog(): re-fetch AUTHORITATIVE variant prices from the public
//     Storefront API server-side. This is what makes "never trust client prices"
//     real: the browser sends variant GIDs + quantities, the server asks Shopify
//     for the actual price/title/availability of exactly those variants.
//  B) createShopifyOrder(): after payment, push the order into Shopify via the
//     Admin API so inventory + fulfilment flow (headless). PROVIDER-AGNOSTIC:
//     both the Stripe and PayPal rails call this ONE function via
//     _shared/fulfillment.ts.
//
// CANONICALIZATION NOTE (2026-07-28, PayPal build): this project had drifted
// into TWO copies of this file — create-checkout-session's (send_receipt:false,
// unused there since that function never calls createShopifyOrder) and
// stripe-webhook's (send_receipt:true, the one actually live-effective). See
// supabase/README.md "Deploy note (stripe-webhook _shared)" for the history.
// This is now the SINGLE canonical copy (send_receipt/send_fulfillment_receipt
// true, matching live behavior; `lang` preserved; shipping_lines gets a `code`
// for Shopify-side reporting) plus a new `provider` field so the Shopify order's
// tags/note/gateway correctly say "Stripe" or "PayPal". Every function that
// needs Shopify order creation must bundle THIS exact file, never a hand copy —
// that discipline is what _shared/fulfillment.ts exists to enforce in code.

import type { CatalogVariant } from './pricing.ts';
import { getConfig } from './env.ts';

// Public Storefront token is safe to embed (it is client-side by design in the
// site). Overridable via env; defaults match the repo's js/shopify.js.
const STORE_DOMAIN = getConfig('SHOPIFY_STORE_DOMAIN', 'rta3sf-47.myshopify.com');
const STOREFRONT_TOKEN = getConfig('SHOPIFY_STOREFRONT_TOKEN', '54674b6ccdc6cdd3817ee38afd8db4aa');
const API_VERSION = getConfig('SHOPIFY_API_VERSION', '2025-01');

/** Extract the numeric id from a Shopify GID ("gid://shopify/ProductVariant/123" -> "123"). */
export function gidToNumericId(gid: string): string {
  const m = String(gid || '').match(/(\d+)\s*$/);
  return m ? m[1] : '';
}

// Per-product country of manufacture (Goal B / DDP customs label). Resolved from
// env COUNTRY_OF_ORIGIN_MAP (JSON: { "handle": "CN" }).
function originMap(): Record<string, string> {
  try {
    return JSON.parse(getConfig('COUNTRY_OF_ORIGIN_MAP', '{}'));
  } catch {
    return {};
  }
}

interface StorefrontVariantNode {
  id: string;
  title: string;
  availableForSale: boolean;
  price: { amount: string; currencyCode: string };
  selectedOptions: { name: string; value: string }[];
  product: { title: string; handle: string };
}

/**
 * Re-fetch authoritative variant data for the given GIDs from the Storefront API.
 * Returns a Map keyed by variant GID. Unknown/invalid ids are simply absent, so
 * priceCart() drops them. Throws only on a transport/API failure (caller decides
 * whether to fall back to the Supabase products mirror or fail the checkout).
 */
export async function fetchVariantCatalog(variantIds: string[]): Promise<Map<string, CatalogVariant>> {
  const ids = [...new Set(variantIds.filter((v) => typeof v === 'string' && v.startsWith('gid://')))];
  const out = new Map<string, CatalogVariant>();
  if (!ids.length) return out;

  const query = `query($ids:[ID!]!){ nodes(ids:$ids){ ... on ProductVariant {
    id title availableForSale
    price { amount currencyCode }
    selectedOptions { name value }
    product { title handle }
  } } }`;

  const res = await fetch(`https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables: { ids } }),
  });
  if (!res.ok) throw new Error(`Storefront API HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Storefront API: ${JSON.stringify(json.errors)}`);

  const origins = originMap();
  for (const node of (json.data?.nodes ?? []) as (StorefrontVariantNode | null)[]) {
    if (!node || !node.id || !node.price) continue;
    let size = '';
    let color = '';
    for (const o of node.selectedOptions ?? []) {
      if (/size/i.test(o.name)) size = o.value;
      else if (/colou?r/i.test(o.name)) color = o.value;
    }
    const variantTitle = [color, size].filter(Boolean).join(' / ') || node.title || '';
    const handle = node.product?.handle ?? '';
    out.set(node.id, {
      variantId: node.id,
      priceMajor: parseFloat(node.price.amount),
      currency: node.price.currencyCode || 'AED',
      title: node.product?.title ?? '',
      variantTitle,
      handle,
      size,
      available: node.availableForSale !== false,
      countryOfOrigin: origins[handle] ?? null,
    });
  }
  return out;
}

export type PaymentProvider = 'stripe' | 'paypal';

export interface ShopifyOrderInput {
  email: string;
  currency: string;                 // store base currency (upper or lower), e.g. "AED"
  totalMajor: number;               // order total in base currency major units (INCLUDING shipping)
  lineItems: { variantId: string; quantity: number }[];
  shipping: any;                    // Stripe shipping_details / PayPal shipping.address, normalized shape
  stripeSessionId?: string;
  stripeOrderId: string;            // our internal stripe_orders.id (uuid) — provider-agnostic despite the name
  shippingMajor?: number;           // shipping charged, base currency major units (0 = complimentary)
  lang?: string;                    // customer language for the order-email template (additive)
  provider?: PaymentProvider;       // which rail paid this (default 'stripe' for backward compatibility)
  paypalOrderId?: string;
  paypalCaptureId?: string;
}

export interface ShopifyOrderResult {
  ok: boolean;
  shopifyOrderId?: number;
  status: 'synced' | 'skipped' | 'failed';
  error?: string;
}

function mapShippingAddress(shipping: any): Record<string, unknown> | undefined {
  const a = shipping?.address ?? shipping;
  if (!a) return undefined;
  const name = String(shipping?.name ?? '').trim();
  const [first, ...rest] = name.split(' ');
  return {
    first_name: first || name || undefined,
    last_name: rest.join(' ') || undefined,
    address1: a.line1 ?? undefined,
    address2: a.line2 ?? undefined,
    city: a.city ?? undefined,
    province: a.state ?? undefined,
    zip: a.postal_code ?? undefined,
    country_code: a.country ?? undefined,
    phone: shipping?.phone ?? undefined,
  };
}

/**
 * Create a PAID order in Shopify via the Admin API for fulfilment + inventory.
 * Graceful by contract: returns status 'skipped' when no admin token is set, and
 * 'failed' (never throws) on any API error, so the caller can record the paid
 * order regardless and a sale is never lost.
 *
 * The shipping charge is sent as a shipping_line so the Shopify order total
 * reconciles with what the payment provider actually captured. Without it
 * Shopify would total only the goods and disagree with the transaction amount
 * (the exact bug this consolidation exists to prevent — see the file header).
 * PROVIDER-AGNOSTIC: called identically by Stripe and PayPal via
 * _shared/fulfillment.ts; only `provider` + the payment reference differ.
 */
export async function createShopifyOrder(
  input: ShopifyOrderInput,
  adminToken: string,
): Promise<ShopifyOrderResult> {
  if (!adminToken) return { ok: false, status: 'skipped', error: 'SHOPIFY_ADMIN_TOKEN not configured' };

  const line_items = input.lineItems
    .map((li) => ({ variant_id: Number(gidToNumericId(li.variantId)), quantity: li.quantity }))
    .filter((li) => Number.isFinite(li.variant_id) && li.variant_id > 0);
  if (!line_items.length) return { ok: false, status: 'failed', error: 'no resolvable variant ids' };

  const currency = String(input.currency || 'AED').toUpperCase();
  const shippingMajor = Number(input.shippingMajor ?? 0);
  const shipping_lines = shippingMajor > 0
    ? [{ title: 'Standard shipping', price: shippingMajor.toFixed(2), code: 'STANDARD' }]
    : [{ title: 'Complimentary shipping', price: '0.00', code: 'FREE' }];

  const provider: PaymentProvider = input.provider ?? 'stripe';
  const gateway = provider === 'paypal' ? 'PayPal (custom checkout)' : 'Stripe (custom checkout)';
  const paymentRef = provider === 'paypal'
    ? `paypal_order=${input.paypalOrderId ?? ''}; paypal_capture=${input.paypalCaptureId ?? ''}; internal_order=${input.stripeOrderId}`
    : `stripe_session=${input.stripeSessionId ?? ''}; internal_order=${input.stripeOrderId}`;
  const noteAttributes = provider === 'paypal'
    ? [
        { name: 'paypal_order_id', value: input.paypalOrderId ?? '' },
        { name: 'paypal_capture_id', value: input.paypalCaptureId ?? '' },
        { name: 'internal_order_id', value: input.stripeOrderId },
        { name: 'lang', value: (input.lang || '') },
      ]
    : [
        { name: 'stripe_session_id', value: input.stripeSessionId ?? '' },
        { name: 'internal_order_id', value: input.stripeOrderId },
        { name: 'lang', value: (input.lang || '') },
      ];

  const body = {
    order: {
      email: input.email || undefined,
      currency,
      financial_status: 'paid',
      inventory_behaviour: 'decrement_obeying_policy',
      line_items,
      shipping_lines,
      shipping_address: mapShippingAddress(input.shipping),
      tags: `cloudskin-${provider}, source:${provider}-checkout`,
      note: `Paid via ${provider === 'paypal' ? 'PayPal' : 'Stripe'} custom checkout. ${paymentRef}`,
      note_attributes: noteAttributes,
      transactions: [{
        kind: 'sale',
        status: 'success',
        amount: input.totalMajor.toFixed(2),
        currency,
        gateway,
      }],
      // Shopify sends the branded order-confirmation email (send_receipt) and, on
      // fulfilment, the shipping/tracking email (send_fulfillment_receipt) from the
      // authenticated info@cloudskin.com sender — the customer's order + tracking
      // email chain for the headless store, identical for every rail. (This
      // canonical file fixes the drift where create-checkout-session's unused
      // copy had these false; stripe-webhook's live copy already had them true.)
      send_receipt: true,
      send_fulfillment_receipt: true,
    },
  };

  try {
    const res = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/orders.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': adminToken },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: 'failed', error: `Admin API HTTP ${res.status}: ${text.slice(0, 500)}` };
    }
    const json = JSON.parse(text);
    return { ok: true, status: 'synced', shopifyOrderId: json?.order?.id };
  } catch (e) {
    return { ok: false, status: 'failed', error: (e as Error).message };
  }
}
