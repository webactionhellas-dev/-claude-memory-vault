// ============================================================================
// CloudSkin, create-checkout-elements  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// PUBLIC endpoint (deploy with --no-verify-jwt): powers the UNIFIED on-page
// checkout (/checkout). Creates a Stripe Checkout Session in `ui_mode: 'elements'`
// and returns its client_secret + publishable key so the browser can mount the
// embedded Payment Element (card + Apple Pay + Google Pay + Link) on OUR branded
// page instead of redirecting to checkout.stripe.com.
//
// It shares EVERYTHING money-bearing with the hosted create-checkout-session
// fallback via _shared/checkout-session.ts (prepareCheckout + buildSessionParams):
// same authoritative re-price, same single server-decided shipping option, same
// allow_promotion_codes (WELCOME10) + first-order customer pinning, same PENDING
// ledger row. The ONLY differences are ui_mode + the redirect shape.
//
// The webhook is UNCHANGED: an elements-mode session still fires
// checkout.session.completed, so stripe-webhook -> markPaidAndSync -> Shopify
// fulfilment works exactly as it does today. Nothing about the paid path changes.
//
// On ANY failure the browser falls back to the hosted create-checkout-session
// redirect (and ultimately to Shopify hosted checkout), so no sale is dead-ended.
// ============================================================================
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getConfig } from '../_shared/env.ts';
import { json, prepareCheckout, buildSessionParams } from '../_shared/checkout-session.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, req);

  const prep = await prepareCheckout(req, 'elements');
  if (!prep.ok) return prep.response;
  const { ctx } = prep;

  const SITE = getConfig('SITE_URL', 'https://www.cloudskin.com').replace(/\/$/, '');
  const returnUrl = getConfig('CHECKOUT_RETURN_URL', `${SITE}/account?order=success&session_id={CHECKOUT_SESSION_ID}`);

  let session;
  try {
    const params = buildSessionParams({ uiMode: 'elements', ctx, lang: ctx.lang, returnUrl });
    session = await ctx.stripe.checkout.sessions.create(params as any);
  } catch (e: any) {
    // Bin the orphan pending order so junk does not accumulate (same pattern as the hosted rail).
    await ctx.supabase.from('stripe_order_items').delete().eq('order_id', ctx.orderId);
    await ctx.supabase.from('stripe_orders').delete().eq('id', ctx.orderId);
    console.error('[checkout-elements] Stripe session create failed:', e?.message ?? e);
    return json({ error: 'Payment could not be started. Please try again shortly.', code: 'stripe_session_failed' }, 502, req);
  }

  await ctx.supabase.from('stripe_orders').update({ stripe_session_id: session.id }).eq('id', ctx.orderId);

  // The publishable key is PUBLIC by Stripe's design (it is embedded in the browser
  // to init Stripe.js). Returning it here keeps the client's key in lock-step with
  // the SAME account/mode (test vs live) that minted this session. If it is not
  // configured the client falls back to the hosted redirect rather than half-init.
  const publishableKey = getConfig('STRIPE_PUBLISHABLE_KEY', '');
  if (!publishableKey) {
    console.warn('[checkout-elements] STRIPE_PUBLISHABLE_KEY not set; client will fall back to hosted checkout.');
  }

  return json(
    {
      clientSecret: (session as any).client_secret,
      publishableKey,
      sessionId: session.id,
      orderId: ctx.orderId,
    },
    200,
    req,
  );
});
