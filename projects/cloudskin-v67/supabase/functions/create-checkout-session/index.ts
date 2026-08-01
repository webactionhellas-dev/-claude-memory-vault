// ============================================================================
// CloudSkin, create-checkout-session  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// PUBLIC endpoint (deploy with --no-verify-jwt): the HOSTED Stripe Checkout rail
// (redirect to checkout.stripe.com). This is now the FALLBACK behind the embedded
// on-page checkout (create-checkout-elements): the /checkout page tries the
// embedded Payment Element first and drops back to this hosted redirect on any
// failure, so no sale is ever dead-ended.
//
// 2026-07-28 REFACTOR (unified checkout build): the orchestration (CORS + rate
// limit + validation + AUTHORITATIVE re-price + presentment + shipping + returning-
// customer lookup + PENDING ledger row) and the Stripe session-params assembly are
// now _shared/checkout-session.ts's prepareCheckout() + buildSessionParams(), the
// SAME functions create-checkout-elements calls. This is the concrete fix for the
// class of money-drift bug the house treats seriously (see _shared/shipping.ts and
// _shared/fulfillment.ts headers): the two rails can no longer disagree on the
// amount, the shipping option, promo enablement, or customer pinning, because they
// build from ONE builder. Behaviour on this rail is UNCHANGED — same params (verified
// by tests/checkout-session.test.ts), same { url } response, same webhook contract.
//
// Presentment (Goal A): 'adaptive' (default) keeps line items in the base currency
// and lets Stripe Adaptive Pricing present + charge the buyer's local currency.
// Shipping (Goal C): exactly one server-decided option (flat under the free-ship
// threshold, complimentary at/above it). Welcome offer (Goal D): allow_promotion_
// codes + first-order customer pinning so WELCOME10's restriction actually bites.
// ============================================================================
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getConfig } from '../_shared/env.ts';
import { json, prepareCheckout, buildSessionParams } from '../_shared/checkout-session.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, req);

  const prep = await prepareCheckout(req, 'hosted');
  if (!prep.ok) return prep.response;
  const { ctx } = prep;

  const SITE = getConfig('SITE_URL', 'https://www.cloudskin.com').replace(/\/$/, '');
  const successUrl = getConfig('CHECKOUT_SUCCESS_URL', `${SITE}/account?order=success&session_id={CHECKOUT_SESSION_ID}`);
  const cancelUrl = getConfig('CHECKOUT_CANCEL_URL', `${SITE}/?checkout=cancelled`);

  let session;
  try {
    const params = buildSessionParams({ uiMode: 'hosted', ctx, lang: ctx.lang, successUrl, cancelUrl });
    session = await ctx.stripe.checkout.sessions.create(params as any);
  } catch (e: any) {
    // Bin the orphan pending order so junk does not accumulate.
    await ctx.supabase.from('stripe_order_items').delete().eq('order_id', ctx.orderId);
    await ctx.supabase.from('stripe_orders').delete().eq('id', ctx.orderId);
    console.error('[checkout] Stripe session create failed:', e?.message ?? e);
    return json({ error: 'Payment could not be started. Please try again shortly.' }, 502, req);
  }

  await ctx.supabase.from('stripe_orders').update({ stripe_session_id: session.id }).eq('id', ctx.orderId);
  return json({ url: (session as any).url, sessionId: session.id }, 200, req);
});
