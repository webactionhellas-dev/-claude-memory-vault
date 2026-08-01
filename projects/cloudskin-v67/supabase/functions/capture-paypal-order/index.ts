// ============================================================================
// CloudSkin, capture-paypal-order  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// PUBLIC endpoint (deploy with --no-verify-jwt): called by the browser's
// PayPal Smart Buttons onApprove callback, right after the buyer approves the
// payment in PayPal's popup. This is the SYNCHRONOUS confirmation leg; the
// ASYNC leg (paypal-webhook) exists specifically so fulfilment does not depend
// solely on this call completing (the buyer's tab could close, the network
// could drop). Both legs call the SAME _shared/paypal-checkout.ts
// completePayPalOrder(), so whichever fires first fulfils and the other is a
// safe, atomic no-op — this file is intentionally a thin HTTP wrapper with only
// request validation + rate limiting, no business logic of its own.
// ============================================================================
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
import { serviceClient, serviceReady, getConfig } from '../_shared/env.ts';
import { completePayPalOrder } from '../_shared/paypal-checkout.ts';

const json = (obj: unknown, status: number, req: Request) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  });

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  return xff.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, req);
  if (!isAllowedOrigin(req)) return json({ error: 'Origin not allowed.' }, 403, req);
  if (!serviceReady()) return json({ error: 'Checkout is not configured.' }, 503, req);

  const supabase = serviceClient();
  const ip = clientIp(req);
  try {
    const { data: allowed } = await supabase.rpc('stripe_checkout_rate_hit', {
      p_ip: ip, p_max: 20, p_window_seconds: 300,
    });
    if (allowed === false) return json({ error: 'Too many attempts. Please wait a moment.' }, 429, req);
  } catch (_e) { /* best-effort */ }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400, req); }
  const paypalOrderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
  if (!paypalOrderId || paypalOrderId.length > 64 || !/^[A-Za-z0-9-]+$/.test(paypalOrderId)) {
    return json({ error: 'Invalid order.' }, 400, req);
  }

  const result = await completePayPalOrder(paypalOrderId);
  const SITE = getConfig('SITE_URL', 'https://www.cloudskin.com').replace(/\/$/, '');

  if (result.status === 'paid' || result.status === 'already_paid') {
    return json({ status: 'paid', redirect: `${SITE}/account.html?order=success` }, 200, req);
  }
  if (result.status === 'pending') {
    return json({ status: 'pending', message: 'Your payment is processing; you will receive a confirmation email shortly.' }, result.httpStatus, req);
  }
  return json({ error: result.error || 'Payment could not be completed.' }, result.httpStatus, req);
});
