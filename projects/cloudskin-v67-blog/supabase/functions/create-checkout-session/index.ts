// ============================================================================
// CloudSkin, create-checkout-session  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// PUBLIC endpoint (deploy with --no-verify-jwt): anonymous shoppers check out.
// Flow:
//   1) CORS + method + rate limit + input validation (boundary hardening)
//   2) re-fetch AUTHORITATIVE variant prices from Shopify (never trust the client)
//   3) re-price the cart server-side (pure seam _shared/pricing.ts)
//   4) record a PENDING stripe_orders row + line snapshot
//   5) create a Stripe Checkout Session (redirect) in the customer's currency
//   6) return { url } for the browser to redirect to
//
// Goal A (pay in local currency): presentment mode is a config flag.
//   * "adaptive" (default): line items in the store BASE currency; Stripe
//     Adaptive Pricing (Dashboard toggle) presents + charges the buyer's local
//     currency and OWNS the FX. Zero FX math here.
//   * "manual": session currency = the customer's selected currency, amounts
//     converted via the injected-rate seam _shared/fx.ts. Falls back to adaptive
//     if a rate is missing (never charges a wrong amount).
// Goal B (DDP): prices are duties-inclusive (owner-set); we collect the shipping
//   address and stamp duties_included = true. Per-line country_of_origin is a hook.
// ============================================================================
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
import { getConfig, serviceClient, serviceReady } from '../_shared/env.ts';
import { getStripe } from '../_shared/stripe.ts';
import { fetchVariantCatalog } from '../_shared/shopify.ts';
import { priceCart, MAX_QTY, type ClientLine } from '../_shared/pricing.ts';
import { convertMinor, type RateTable } from '../_shared/fx.ts';
import { normalizeCurrency } from '../_shared/money.ts';

const MAX_LINES = 50;
const GID_RE = /^gid:\/\/shopify\/ProductVariant\/\d+$/;

// Countries CloudSkin ships to (DDP). Stripe needs an explicit ISO allowlist.
const SHIP_COUNTRIES = [
  'AE', 'SA', 'QA', 'BH', 'KW', 'OM', 'JO', 'LB', 'EG', 'IL', 'TR',
  'GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'GR', 'CY',
  'SE', 'DK', 'FI', 'NO', 'CH', 'PL', 'CZ', 'RO', 'HU',
  'US', 'CA', 'AU', 'NZ', 'JP', 'SG', 'HK', 'AE',
];

// Static EUR-referenced FX fallback (mirrors js/i18n.js so charge ~= displayed).
// Only used in "manual" mode when FX_RATES_URL is not configured.
const STATIC_RATES: RateTable = {
  EUR: 1, USD: 1.14, AUD: 1.63, AED: 4.2, GBP: 0.849,
  THB: 38.4, SEK: 11.05, RUB: 88, SAR: 4.28, KWD: 0.354,
};

const json = (obj: unknown, status: number, req: Request) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  });

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  return xff.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || '';
}

async function loadRates(): Promise<RateTable> {
  const url = getConfig('FX_RATES_URL');
  if (!url) return STATIC_RATES;
  try {
    const res = await fetch(url);
    if (!res.ok) return STATIC_RATES;
    const data = await res.json();
    // Accept { rates: {...} } or a flat map; ensure EUR reference exists.
    const table: RateTable = data?.rates ?? data;
    if (table && typeof table.EUR === 'number') return table;
    return STATIC_RATES;
  } catch {
    return STATIC_RATES;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, req);
  if (!isAllowedOrigin(req)) return json({ error: 'Origin not allowed.' }, 403, req);

  if (!serviceReady()) return json({ error: 'Checkout is not configured.' }, 503, req);
  const supabase = serviceClient();

  // --- rate limit (best-effort, per IP): 15 checkouts / 5 min ---
  const ip = clientIp(req);
  try {
    const { data: allowed } = await supabase.rpc('stripe_checkout_rate_hit', {
      p_ip: ip, p_max: 15, p_window_seconds: 300,
    });
    if (allowed === false) return json({ error: 'Too many attempts. Please wait a moment.' }, 429, req);
  } catch (_e) {
    // throttle table not present yet -> do not block checkout on it
  }

  // --- parse + validate ---
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request.' }, 400, req);
  }
  const rawLines = Array.isArray(body?.lines) ? body.lines : [];
  if (!rawLines.length) return json({ error: 'Your bag is empty.' }, 400, req);
  if (rawLines.length > MAX_LINES) return json({ error: 'Too many items.' }, 400, req);

  const lines: ClientLine[] = [];
  for (const l of rawLines) {
    if (!l || typeof l.variantId !== 'string' || !GID_RE.test(l.variantId)) {
      return json({ error: 'Invalid item in bag.' }, 400, req);
    }
    const q = Math.floor(Number(l.quantity) || 1);
    if (q < 1 || q > MAX_QTY) return json({ error: `Quantity must be 1 to ${MAX_QTY}.` }, 400, req);
    lines.push({ variantId: l.variantId, quantity: q, size: typeof l.size === 'string' ? l.size : undefined });
  }

  const selectedCurrency = normalizeCurrency(typeof body?.currency === 'string' ? body.currency : 'eur');
  const email = typeof body?.email === 'string' && body.email.includes('@') ? body.email.trim() : null;

  // --- Stripe readiness (keys pending until go-live) ---
  const stripe = await getStripe();
  if (!stripe) {
    return json({ error: 'Payments are not enabled yet. Please try again soon.', code: 'stripe_unconfigured' }, 503, req);
  }

  // --- authoritative re-fetch + re-price (NEVER trust client prices) ---
  let catalog;
  try {
    catalog = await fetchVariantCatalog(lines.map((l) => l.variantId));
  } catch (e) {
    console.error('[checkout] Storefront fetch failed:', (e as Error).message);
    return json({ error: 'Could not verify prices right now. Please try again.' }, 502, req);
  }
  const storeBaseFallback = normalizeCurrency(getConfig('STORE_BASE_CURRENCY', 'eur'));
  const { items, subtotalCents, baseCurrency, dropped } = priceCart(catalog, lines, storeBaseFallback);
  if (!items.length) {
    return json({ error: 'None of your items are available for checkout right now.' }, 409, req);
  }

  // --- presentment mode (Goal A) ---
  const configuredMode = (getConfig('CHECKOUT_PRESENTMENT_MODE', 'adaptive') || 'adaptive').toLowerCase();
  let presentmentMode: 'adaptive' | 'manual' = configuredMode === 'manual' ? 'manual' : 'adaptive';
  let sessionCurrency = baseCurrency;
  let displayItems = items.map((it) => ({ ...it })); // amounts stay in base currency

  if (presentmentMode === 'manual' && selectedCurrency !== baseCurrency) {
    const rates = await loadRates();
    const feeBps = Number(getConfig('FX_FEE_BPS', '0')) || 0;
    const converted = items.map((it) => convertMinor(it.unit_price_cents, baseCurrency, selectedCurrency, rates, feeBps));
    if (converted.every((c) => c.ok)) {
      sessionCurrency = selectedCurrency;
      displayItems = items.map((it, i) => ({ ...it, unit_price_cents: converted[i].targetMinor, currency: selectedCurrency }));
    } else {
      // A rate was missing: fall back to adaptive rather than charge a wrong amount.
      console.warn('[checkout] manual FX unavailable, falling back to adaptive.');
      presentmentMode = 'adaptive';
    }
  }

  const duties = getConfig('DUTIES_INCLUDED', 'true') !== 'false';

  // --- record a PENDING order (source of truth) BEFORE creating the session ---
  const { data: order, error: orderErr } = await supabase
    .from('stripe_orders')
    .insert({
      user_id: null,
      email,
      status: 'pending',
      base_currency: baseCurrency,
      base_subtotal_cents: subtotalCents,
      base_total_cents: subtotalCents, // shipping/duties already inside the prices
      duties_included: duties,
      presentment_mode: presentmentMode,
      metadata: { dropped, ip_hash: ip ? await sha256(ip) : null, selected_currency: selectedCurrency },
    })
    .select('id')
    .single();
  if (orderErr || !order) {
    console.error('[checkout] order insert failed:', orderErr?.message);
    return json({ error: 'Could not start the order.' }, 500, req);
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

  // --- create the Stripe Checkout Session ---
  const SITE = getConfig('SITE_URL', 'https://www.cloudskin.com').replace(/\/$/, '');
  const successUrl = getConfig('CHECKOUT_SUCCESS_URL', `${SITE}/account.html?order=success&session_id={CHECKOUT_SESSION_ID}`);
  const cancelUrl = getConfig('CHECKOUT_CANCEL_URL', `${SITE}/?checkout=cancelled`);

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: displayItems.map((it) => ({
        quantity: it.quantity,
        price_data: {
          currency: sessionCurrency,
          unit_amount: it.unit_price_cents,
          product_data: {
            name: it.title || 'CloudSkin item',
            description: [it.variant_title, it.size].filter(Boolean).join(' | ') || undefined,
          },
        },
      })),
      customer_email: email ?? undefined,
      metadata: { order_id: order.id, presentment_mode: presentmentMode, base_currency: baseCurrency },
      payment_intent_data: { metadata: { order_id: order.id } },
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: [...new Set(SHIP_COUNTRIES)] as any },
      automatic_tax: { enabled: false }, // prices are duties/tax-inclusive (DDP)
    });
  } catch (e: any) {
    // Bin the orphan pending order so junk does not accumulate.
    await supabase.from('stripe_order_items').delete().eq('order_id', order.id);
    await supabase.from('stripe_orders').delete().eq('id', order.id);
    console.error('[checkout] Stripe session create failed:', e?.message ?? e);
    return json({ error: 'Payment could not be started. Please try again shortly.' }, 502, req);
  }

  await supabase.from('stripe_orders').update({ stripe_session_id: session.id }).eq('id', order.id);
  return json({ url: session.url, sessionId: session.id }, 200, req);
});

// Small SHA-256 helper so we store a hashed IP (privacy) rather than the raw one.
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
