// ============================================================================
// CloudSkin, checkout-session shared core  (Deno edge runtime)
// ----------------------------------------------------------------------------
// THE single source of truth for building a Stripe Checkout Session, shared by
// BOTH rails so they can never drift on money:
//   * create-checkout-session   -> ui_mode 'hosted'  (returns a redirect url; the
//                                   proven fallback, unchanged behaviour)
//   * create-checkout-elements  -> ui_mode 'elements' (returns a client_secret; the
//                                   embedded on-page Payment Element + wallets)
//
// This is the same anti-drift discipline as _shared/shipping.ts and
// _shared/fulfillment.ts (see their headers): the part most prone to a silent
// money bug — the amount, the single server-decided shipping option, promo
// enablement, customer pinning, the pending-order ledger row — lives here ONCE.
// The two thin endpoints differ only in ui_mode and the redirect shape.
//
// prepareCheckout() runs the shared orchestration (CORS + rate limit + input
// validation + AUTHORITATIVE re-price + presentment + shipping + returning-
// customer lookup + PENDING ledger row) and returns a CheckoutContext.
// buildSessionParams() is a PURE assembler (unit-tested in tests/checkout-session
// .test.ts) that turns a context into Stripe session-create params for a ui_mode.
// ============================================================================
import type { Stripe } from './stripe.ts';
import { corsHeaders, isAllowedOrigin } from './cors.ts';
import { getConfig, serviceClient, serviceReady } from './env.ts';
import { getStripe } from './stripe.ts';
import { fetchVariantCatalog } from './shopify.ts';
import { priceCart, MAX_QTY, type ClientLine, type PricedItem } from './pricing.ts';
import { convertMinor, type RateTable } from './fx.ts';
import { normalizeCurrency } from './money.ts';
import { SHIP_DEFAULTS, computeShipping } from './shipping.ts';
import { loadRates } from './rates.ts';
import { buildSessionParams, type SessionParamsInput } from './session-params.ts';

// Re-export the pure assembler so endpoints import both prep + build from one place.
export { buildSessionParams };
export type { SessionParamsInput };

const MAX_LINES = 50;
const GID_RE = /^gid:\/\/shopify\/ProductVariant\/\d+$/;

// ---- small shared HTTP + crypto helpers (single copy, used by both endpoints) ----
export const json = (obj: unknown, status: number, req: Request) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  });

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  return xff.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || '';
}

/** Read a non-negative number from config; an explicit "0" is honoured (a plain || would drop it). */
export function cfgNum(key: string, fallback: number): number {
  const raw = getConfig(key, '');
  if (raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The line-item amounts + currency actually presented to Stripe, and everything a
// session-params builder needs. This is the payload prepareCheckout() hands to
// buildSessionParams().
export interface CheckoutContext {
  supabase: ReturnType<typeof serviceClient>;
  stripe: Stripe;
  orderId: string;
  // amounts (already in sessionCurrency; in adaptive mode == base currency)
  displayItems: PricedItem[];
  sessionCurrency: string;         // lower-case ISO
  baseCurrency: string;            // lower-case ISO (store base, e.g. aed)
  presentmentMode: 'adaptive' | 'manual';
  // shipping (the ONE server-decided option)
  shipMinorSession: number;        // minor units of sessionCurrency
  shipMinorBase: number;           // minor units of baseCurrency (folded into base_total)
  shippingIsFree: boolean;
  // customer / metadata
  existingCustomerId: string | null;
  email: string | null;
  lang: string;
}

export type PrepareResult =
  | { ok: true; ctx: CheckoutContext }
  | { ok: false; response: Response };

/**
 * Shared orchestration up to and including the PENDING ledger row. Identical for
 * both rails: the browser only ever sends cart lines + selected currency + email,
 * and the SERVER decides every number. Returns either a ready CheckoutContext or a
 * finished Response (validation / rate-limit / readiness errors), so each endpoint
 * stays a thin wrapper.
 */
export async function prepareCheckout(req: Request, uiMode: 'hosted' | 'elements'): Promise<PrepareResult> {
  if (!isAllowedOrigin(req)) return { ok: false, response: json({ error: 'Origin not allowed.' }, 403, req) };
  if (!serviceReady()) return { ok: false, response: json({ error: 'Checkout is not configured.' }, 503, req) };
  const supabase = serviceClient();

  // --- rate limit (best-effort, per IP): 15 checkouts / 5 min (same bucket both rails) ---
  const ip = clientIp(req);
  try {
    const { data: allowed } = await supabase.rpc('stripe_checkout_rate_hit', {
      p_ip: ip, p_max: 15, p_window_seconds: 300,
    });
    if (allowed === false) return { ok: false, response: json({ error: 'Too many attempts. Please wait a moment.' }, 429, req) };
  } catch (_e) {
    // throttle table not present yet -> do not block checkout on it
  }

  // --- parse + validate ---
  let body: any;
  try {
    body = await req.json();
  } catch {
    return { ok: false, response: json({ error: 'Bad request.' }, 400, req) };
  }
  const rawLines = Array.isArray(body?.lines) ? body.lines : [];
  if (!rawLines.length) return { ok: false, response: json({ error: 'Your bag is empty.' }, 400, req) };
  if (rawLines.length > MAX_LINES) return { ok: false, response: json({ error: 'Too many items.' }, 400, req) };

  const lines: ClientLine[] = [];
  for (const l of rawLines) {
    if (!l || typeof l.variantId !== 'string' || !GID_RE.test(l.variantId)) {
      return { ok: false, response: json({ error: 'Invalid item in bag.' }, 400, req) };
    }
    const q = Math.floor(Number(l.quantity) || 1);
    if (q < 1 || q > MAX_QTY) return { ok: false, response: json({ error: `Quantity must be 1 to ${MAX_QTY}.` }, 400, req) };
    lines.push({ variantId: l.variantId, quantity: q, size: typeof l.size === 'string' ? l.size : undefined });
  }

  const selectedCurrency = normalizeCurrency(typeof body?.currency === 'string' ? body.currency : 'eur');
  const email = typeof body?.email === 'string' && body.email.includes('@') ? body.email.trim() : null;
  const lang = typeof body?.lang === 'string' && /^[a-z]{2}$/i.test(body.lang.trim()) ? body.lang.trim().toLowerCase() : 'en';

  // --- Stripe readiness (keys pending until go-live) ---
  const stripe = await getStripe();
  if (!stripe) {
    return { ok: false, response: json({ error: 'Payments are not enabled yet. Please try again soon.', code: 'stripe_unconfigured' }, 503, req) };
  }

  // --- authoritative re-fetch + re-price (NEVER trust client prices) ---
  let catalog;
  try {
    catalog = await fetchVariantCatalog(lines.map((l) => l.variantId));
  } catch (e) {
    console.error('[checkout] Storefront fetch failed:', (e as Error).message);
    return { ok: false, response: json({ error: 'Could not verify prices right now. Please try again.' }, 502, req) };
  }
  const storeBaseFallback = normalizeCurrency(getConfig('STORE_BASE_CURRENCY', 'aed'));
  const { items, subtotalCents, baseCurrency, dropped } = priceCart(catalog, lines, storeBaseFallback);
  if (!items.length) {
    return { ok: false, response: json({ error: 'None of your items are available for checkout right now.' }, 409, req) };
  }

  // --- presentment mode (Goal A). 'adaptive' keeps line items in the base currency
  // and lets Stripe Adaptive Pricing present + charge the buyer's local currency. On
  // the elements rail this is preserved exactly (Adaptive Pricing works with Elements
  // on the Checkout Sessions API; it is the Currency Selector Element client-side). ---
  const configuredMode = (getConfig('CHECKOUT_PRESENTMENT_MODE', 'adaptive') || 'adaptive').toLowerCase();
  let presentmentMode: 'adaptive' | 'manual' = configuredMode === 'manual' ? 'manual' : 'adaptive';
  let sessionCurrency = baseCurrency;
  let displayItems = items.map((it) => ({ ...it }));

  let ratesUsed: RateTable | null = null;
  let feeBpsUsed = 0;

  if (presentmentMode === 'manual' && selectedCurrency !== baseCurrency) {
    const rates = await loadRates();
    const feeBps = Number(getConfig('FX_FEE_BPS', '0')) || 0;
    const converted = items.map((it) => convertMinor(it.unit_price_cents, baseCurrency, selectedCurrency, rates, feeBps));
    if (converted.every((c) => c.ok)) {
      sessionCurrency = selectedCurrency;
      displayItems = items.map((it, i) => ({ ...it, unit_price_cents: converted[i].targetMinor, currency: selectedCurrency }));
      ratesUsed = rates;
      feeBpsUsed = feeBps;
    } else {
      console.warn('[checkout] manual FX unavailable, falling back to adaptive.');
      presentmentMode = 'adaptive';
    }
  }

  // --- shipping (Goal C): flat under the threshold, complimentary at/above it ---
  const freeShipMajor = cfgNum('FREE_SHIP_THRESHOLD_MAJOR', SHIP_DEFAULTS[baseCurrency]?.free ?? 0);
  const flatShipMajor = cfgNum('FLAT_SHIP_MAJOR', SHIP_DEFAULTS[baseCurrency]?.flat ?? 0);
  const { shippingIsFree, shipMinorBase } = computeShipping(baseCurrency, subtotalCents, freeShipMajor, flatShipMajor);
  let shipMinorSession = shipMinorBase;
  if (shipMinorBase > 0 && sessionCurrency !== baseCurrency && ratesUsed) {
    const conv = convertMinor(shipMinorBase, baseCurrency, sessionCurrency, ratesUsed, feeBpsUsed);
    if (conv.ok) shipMinorSession = conv.targetMinor;
  }

  const duties = getConfig('DUTIES_INCLUDED', 'true') !== 'false';

  // --- returning-customer lookup (Goal D): attach the existing Stripe Customer so
  // WELCOME10's first_time_transaction restriction sees real history. Best-effort. ---
  let existingCustomerId: string | null = null;
  if (email) {
    try {
      const found = await stripe.customers.list({ email, limit: 1 });
      existingCustomerId = found.data[0]?.id ?? null;
    } catch (e) {
      console.warn('[checkout] customer lookup failed (continuing as guest):', (e as Error).message);
    }
  }

  // --- record a PENDING order (source of truth) BEFORE creating the session ---
  const { data: order, error: orderErr } = await supabase
    .from('stripe_orders')
    .insert({
      user_id: null,
      email,
      status: 'pending',
      payment_provider: 'stripe',
      base_currency: baseCurrency,
      base_subtotal_cents: subtotalCents,                 // goods only
      base_total_cents: subtotalCents + shipMinorBase,    // goods + shipping, base currency
      duties_included: duties,
      presentment_mode: presentmentMode,
      metadata: {
        dropped,
        ip_hash: ip ? await sha256(ip) : null,
        selected_currency: selectedCurrency,
        stripe_customer: existingCustomerId,
        ui_mode: uiMode, // observability: which rail created this session
        shipping: {
          free: shippingIsFree,
          base_minor: shipMinorBase,
          session_minor: shipMinorSession,
          session_currency: sessionCurrency,
          threshold_major: freeShipMajor,
        },
      },
    })
    .select('id')
    .single();
  if (orderErr || !order) {
    console.error('[checkout] order insert failed:', orderErr?.message);
    return { ok: false, response: json({ error: 'Could not start the order.' }, 500, req) };
  }

  const { error: itemsErr } = await supabase.from('stripe_order_items').insert(
    items.map((it) => ({
      order_id: order.id,
      shopify_variant_id: it.shopify_variant_id,
      product_handle: it.product_handle,
      title: it.title,
      variant_title: it.variant_title,
      size: it.size,
      unit_price_cents: it.unit_price_cents, // base currency (records stay in base)
      currency: baseCurrency,
      quantity: it.quantity,
      country_of_origin: it.country_of_origin,
    })),
  );
  if (itemsErr) console.error('[checkout] items insert failed:', itemsErr.message);

  return {
    ok: true,
    ctx: {
      supabase,
      stripe,
      orderId: order.id,
      displayItems,
      sessionCurrency,
      baseCurrency,
      presentmentMode,
      shipMinorSession,
      shipMinorBase,
      shippingIsFree,
      existingCustomerId,
      email,
      lang,
    },
  };
}
