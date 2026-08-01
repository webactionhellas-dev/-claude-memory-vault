// ============================================================================
// CloudSkin, create-paypal-order  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// PUBLIC endpoint (deploy with --no-verify-jwt): anonymous shoppers check out.
// Mirrors create-checkout-session's Stripe flow EXACTLY for everything that is
// NOT PayPal-specific: same CORS allowlist, same per-IP rate limit RPC, same
// input validation, same fetchVariantCatalog + priceCart re-pricing seam (the
// browser's prices are NEVER trusted), same computeShipping threshold math
// (imported from _shared/shipping.ts, not redefined here — see that file's
// header for why duplicating this logic once already caused a real bug).
//
// PAYPAL-SPECIFIC:
//  * PayPal's Orders v2 API does NOT support AED (verified against
//    developer.paypal.com/reference/currency-codes/, 2026-07-28 — see
//    _shared/paypal-amount.ts's PAYPAL_SUPPORTED_CURRENCIES). The store's base
//    currency is AED, so this function converts the AED-priced cart into
//    PAYPAL_ORDER_CURRENCY (default "usd") using the SAME injected-rate FX
//    seam Stripe's manual presentment mode uses (_shared/rates.ts + fx.ts),
//    never inventing a rate. If a rate is unavailable this FAILS CLOSED (503),
//    it never guesses an amount.
//  * The created PayPal order is intent=CAPTURE, shipping_preference
//    GET_FROM_FILE (PayPal collects/shows the address in its own approval UI,
//    the direct analog of Stripe Checkout's shipping_address_collection).
//  * A pending row is recorded in the SAME stripe_orders/stripe_order_items
//    ledger Stripe uses (payment_provider='paypal'), in the STORE'S base
//    currency (AED) for bookkeeping consistency — the PayPal settlement
//    currency/amount is recorded separately as presentment_currency /
//    presentment_total_cents once captured, exactly mirroring how Stripe's
//    adaptive-pricing presentment already works in this schema.
//  * GET (no body) serves the frontend's PUBLIC PayPal config (client id + the
//    settlement currency). The client id is NOT a secret by PayPal's own design
//    (it is meant to be embedded in the SDK <script> tag). This route gates on a
//    real token fetch, so it only reports ok:true when the configured PayPal env
//    genuinely authenticates — the button stays hidden until then (fail-closed).
//    (The one-time go-live `?diag=` env-check and `?register=` webhook-setup
//    routes were removed 2026-07-28 after the live webhook was registered.)
// ============================================================================
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
import { getConfig, getSecret, serviceClient, serviceReady } from '../_shared/env.ts';
import { fetchVariantCatalog } from '../_shared/shopify.ts';
import { priceCart, MAX_QTY, type ClientLine } from '../_shared/pricing.ts';
import { normalizeCurrency, fromMinorUnits } from '../_shared/money.ts';
import { SHIP_DEFAULTS, computeShipping } from '../_shared/shipping.ts';
import { loadRates } from '../_shared/rates.ts';
import { convertMinor } from '../_shared/fx.ts';
import { buildPayPalAmount, isPayPalSupportedCurrency, type PayPalLineItem } from '../_shared/paypal-amount.ts';
import { paypalEnv, getPayPalAccessToken, createPayPalOrder } from '../_shared/paypal.ts';

const MAX_LINES = 50;
const GID_RE = /^gid:\/\/shopify\/ProductVariant\/\d+$/;

const json = (obj: unknown, status: number, req: Request) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  });

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  return xff.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || '';
}

function cfgNum(key: string, fallback: number): number {
  const raw = getConfig(key, '');
  if (raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  // ---- GET: the frontend's PUBLIC PayPal config (client id + currency). Never
  // touches money. Gates on a real token fetch (getPayPalAccessToken, not just
  // getSecret) so it only reports ok:true when the configured PayPal env genuinely
  // authenticates — the button stays HIDDEN until then (fail-closed). ----
  if (req.method === 'GET') {
    const token = await getPayPalAccessToken();
    if (!token) return json({ ok: false, error: 'PayPal is not configured yet.' }, 503, req);
    const clientId = await getSecret('PAYPAL_CLIENT_ID');
    const currency = normalizeCurrency(getConfig('PAYPAL_ORDER_CURRENCY', 'usd'), 'usd').toUpperCase();
    return json({ ok: true, env: paypalEnv(), clientId, currency }, 200, req);
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, req);
  if (!isAllowedOrigin(req)) return json({ error: 'Origin not allowed.' }, 403, req);
  if (!serviceReady()) return json({ error: 'Checkout is not configured.' }, 503, req);

  const supabase = serviceClient();
  const ip = clientIp(req);

  // --- rate limit (best-effort, per IP): reuses the SAME RPC/table as Stripe
  // checkout — it is a plain IP bucket, nothing Stripe-specific about it. ---
  try {
    const { data: allowed } = await supabase.rpc('stripe_checkout_rate_hit', {
      p_ip: ip, p_max: 15, p_window_seconds: 300,
    });
    if (allowed === false) return json({ error: 'Too many attempts. Please wait a moment.' }, 429, req);
  } catch (_e) { /* throttle table not present -> do not block checkout */ }

  // --- parse + validate (identical shape/limits to create-checkout-session) ---
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400, req); }
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
  const email = typeof body?.email === 'string' && body.email.includes('@') ? body.email.trim() : null;
  const lang = typeof body?.lang === 'string' ? body.lang.slice(0, 10) : undefined;

  // --- PayPal must be reachable + configured before we do any work ---
  const paypalToken = await getPayPalAccessToken();
  if (!paypalToken) {
    return json({ error: 'PayPal checkout is not enabled yet. Please try again soon.', code: 'paypal_unconfigured' }, 503, req);
  }
  const paypalCurrency = normalizeCurrency(getConfig('PAYPAL_ORDER_CURRENCY', 'usd'), 'usd').toUpperCase();
  if (!isPayPalSupportedCurrency(paypalCurrency)) {
    console.error(`[paypal] PAYPAL_ORDER_CURRENCY=${paypalCurrency} is not a PayPal-supported currency.`);
    return json({ error: 'PayPal checkout is temporarily unavailable.', code: 'paypal_currency_unsupported' }, 503, req);
  }

  // --- authoritative re-fetch + re-price (NEVER trust client prices) — SAME seam Stripe uses ---
  let catalog;
  try {
    catalog = await fetchVariantCatalog(lines.map((l) => l.variantId));
  } catch (e) {
    console.error('[paypal] Storefront fetch failed:', (e as Error).message);
    return json({ error: 'Could not verify prices right now. Please try again.' }, 502, req);
  }
  const storeBaseFallback = normalizeCurrency(getConfig('STORE_BASE_CURRENCY', 'aed'));
  const { items, subtotalCents, baseCurrency, dropped } = priceCart(catalog, lines, storeBaseFallback);
  if (!items.length) {
    return json({ error: 'None of your items are available for checkout right now.' }, 409, req);
  }

  // --- shipping (SAME threshold/flat-rate math + defaults as Stripe, imported not redefined) ---
  const freeShipMajor = cfgNum('FREE_SHIP_THRESHOLD_MAJOR', SHIP_DEFAULTS[baseCurrency]?.free ?? 0);
  const flatShipMajor = cfgNum('FLAT_SHIP_MAJOR', SHIP_DEFAULTS[baseCurrency]?.flat ?? 0);
  const { shippingIsFree, shipMinorBase } = computeShipping(baseCurrency, subtotalCents, freeShipMajor, flatShipMajor);
  const baseTotalCents = subtotalCents + shipMinorBase;

  // --- convert base-currency (AED) pricing into PAYPAL_ORDER_CURRENCY. PayPal
  // does not support AED, so this conversion is NOT optional the way Stripe's
  // "manual" mode is — it always runs when baseCurrency !== paypalCurrency.
  // Fails CLOSED (503) if a rate is missing rather than guessing an amount. ---
  let ppItems: PayPalLineItem[];
  let shipMinorPaypal = shipMinorBase;
  if (baseCurrency.toUpperCase() === paypalCurrency) {
    ppItems = items.map((it) => ({ name: [it.title, it.variant_title].filter(Boolean).join(' / '), quantity: it.quantity, unitAmountMinor: it.unit_price_cents }));
  } else {
    const rates = await loadRates();
    const feeBps = Number(getConfig('FX_FEE_BPS', '0')) || 0;
    const convertedItems = items.map((it) => convertMinor(it.unit_price_cents, baseCurrency, paypalCurrency, rates, feeBps));
    const convertedShip = convertMinor(shipMinorBase, baseCurrency, paypalCurrency, rates, feeBps);
    if (!convertedItems.every((c) => c.ok) || !convertedShip.ok) {
      console.error('[paypal] FX conversion unavailable for', baseCurrency, '->', paypalCurrency);
      return json({ error: 'PayPal checkout is temporarily unavailable. Please pay by card instead.', code: 'paypal_fx_unavailable' }, 503, req);
    }
    ppItems = items.map((it, i) => ({
      name: [it.title, it.variant_title].filter(Boolean).join(' / '),
      quantity: it.quantity,
      unitAmountMinor: convertedItems[i].targetMinor,
    }));
    shipMinorPaypal = convertedShip.targetMinor;
  }
  const { amount, items: orderItems } = buildPayPalAmount(ppItems, shipMinorPaypal, paypalCurrency);

  // --- record a PENDING order (source of truth) BEFORE creating the PayPal
  // order, in the STORE's base currency — same bookkeeping as Stripe rows, so
  // fulfillment.ts's shipping-recovery math works identically for both rails. ---
  const { data: order, error: orderErr } = await supabase
    .from('stripe_orders')
    .insert({
      user_id: null,
      email,
      status: 'pending',
      payment_provider: 'paypal',
      base_currency: baseCurrency,
      base_subtotal_cents: subtotalCents,
      base_total_cents: baseTotalCents,
      duties_included: getConfig('DUTIES_INCLUDED', 'true') !== 'false',
      presentment_mode: 'paypal',
      metadata: {
        dropped,
        ip_hash: ip ? await sha256(ip) : null,
        lang,
        paypal_currency: paypalCurrency,
        // The exact amount.value string sent to PayPal at creation time, so
        // capture-paypal-order can cross-check the fetched order still matches
        // what we asked PayPal to charge (defense in depth, see that function's header).
        paypal_total_value: amount.value,
        shipping: { free: shippingIsFree, base_minor: shipMinorBase, paypal_minor: shipMinorPaypal, threshold_major: freeShipMajor },
      },
    })
    .select('id')
    .single();
  if (orderErr || !order) {
    console.error('[paypal] order insert failed:', orderErr?.message);
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
      unit_price_cents: it.unit_price_cents, // base currency (records stay in base, like Stripe)
      currency: baseCurrency,
      quantity: it.quantity,
      country_of_origin: it.country_of_origin,
    })),
  );
  if (itemsErr) console.error('[paypal] items insert failed:', itemsErr.message);

  // --- create the PayPal order ---
  const SITE = getConfig('SITE_URL', 'https://www.cloudskin.com').replace(/\/$/, '');
  const result = await createPayPalOrder({
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: order.id,
      custom_id: order.id,
      amount,
      items: orderItems,
      description: 'CloudSkin order',
    }],
    application_context: {
      brand_name: 'CLOUDSKIN',
      shipping_preference: 'GET_FROM_FILE', // PayPal collects/shows the shipping address in its own approval UI
      user_action: 'PAY_NOW',
      return_url: `${SITE}/account.html?order=success`,
      cancel_url: `${SITE}/?checkout=cancelled`,
    },
  });

  if (!result.ok || !result.id) {
    // Bin the orphan pending order so junk does not accumulate (same pattern as Stripe).
    await supabase.from('stripe_order_items').delete().eq('order_id', order.id);
    await supabase.from('stripe_orders').delete().eq('id', order.id);
    console.error('[paypal] order create failed:', result.error);
    return json({ error: 'Payment could not be started. Please try again shortly.' }, 502, req);
  }

  await supabase.from('stripe_orders').update({ paypal_order_id: result.id }).eq('id', order.id);
  return json({ orderId: result.id }, 200, req);
});
