import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
// Disabled: one-off diagnostic used during the Stripe/Shopify go-live. No logic.
Deno.serve(() => new Response('Gone', { status: 410 }));
