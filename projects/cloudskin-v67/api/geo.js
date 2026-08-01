// Vercel Edge Function: returns the visitor's country from Vercel's built-in
// IP geolocation header. Same-origin, no external service, no visitor data
// leaves Vercel. Consumed by js/i18n.js to pick the storefront DISPLAY currency
// by real location instead of by browser language (which misfires, e.g. an
// Australian on an en-US phone would otherwise be shown USD). The actual charge
// currency is handled separately by Stripe Adaptive Pricing at checkout.
export const config = { runtime: 'edge' };

export default function handler(req) {
  const country = (req.headers.get('x-vercel-ip-country') || '').toUpperCase();
  return new Response(JSON.stringify({ country }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
