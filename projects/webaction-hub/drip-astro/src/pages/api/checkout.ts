import type { APIRoute } from 'astro';
import { products } from '@/lib/products';
import { loadCatalog } from '@/lib/catalog';
import { priceCart, needsStrongAuth } from '@/lib/pricing';
import { validateStock, unavailableMessage, type InventoryRow } from '@/lib/stock';
import { stripe, stripeReady } from '@/lib/stripe';
import { supabaseAdmin, adminReady } from '@/lib/supabase-admin';
import { supabaseServer } from '@/lib/supabase';

export const prerender = false;

const SITE = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4501';

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!stripeReady() || !adminReady()) {
    return json(
      { error: 'Checkout is not configured yet — add your Stripe and Supabase service keys to .env.' },
      503,
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }
  const lines = Array.isArray(body?.lines) ? body.lines : [];
  if (!lines.length) return json({ error: 'Your bag is empty.' }, 400);

  // Pull the live Supabase catalog so prices are the site-owned, current ones
  // (falls back to the static JSON if the DB is unreachable).
  await loadCatalog();

  // Re-price every line from the catalog server-side — never trust client prices.
  // priceCart is the pure, unit-tested security seam (see lib/pricing.ts).
  const { items, subtotalCents: subtotal } = priceCart(products, lines);
  if (!items.length) return json({ error: 'No valid items in your bag.' }, 400);

  // Pre-flight stock check BEFORE any order or Stripe session exists, so an
  // out-of-stock bag gets a clean 409 with per-line detail and nothing to clean
  // up. validateStock is the pure, unit-tested seam (see lib/stock.ts). The
  // tiny race of two payments in the same seconds is accepted: the paid webhook
  // floors stock at 0 and the owner refunds from /admin.
  const slugs = [...new Set(items.map((it) => it.product_slug))];
  const { data: invRows, error: invErr } = await supabaseAdmin
    .from('inventory')
    .select('product_slug,size,quantity')
    .in('product_slug', slugs);
  if (invErr) return json({ error: 'Could not check stock. Please try again shortly.' }, 500);
  const stockCheck = validateStock((invRows ?? []) as InventoryRow[], items);
  if (!stockCheck.ok) {
    return json(
      { error: unavailableMessage(stockCheck.unavailable), unavailable: stockCheck.unavailable },
      409,
    );
  }

  // Attach the order to the logged-in customer when there is one.
  const supabase = supabaseServer(cookies, request);
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? (typeof body?.email === 'string' ? body.email : null);

  // 1) Create a pending order + items.
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: user?.id ?? null,
      email: email ?? 'guest@drip.local',
      status: 'pending',
      subtotal_cents: subtotal,
      total_cents: subtotal,
      currency: 'eur',
    })
    .select('id')
    .single();
  if (orderErr || !order) return json({ error: 'Could not start the order.' }, 500);

  await supabaseAdmin.from('order_items').insert(items.map((it) => ({ order_id: order.id, ...it })));

  // 2) Create the Stripe Checkout Session (hosted, PCI-safe).
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map((it) => ({
        quantity: it.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: it.unit_price_cents,
          product_data: { name: it.name, description: `${it.brand} · Size ${it.size}` },
        },
      })),
      customer_email: email ?? undefined,
      // Coupon codes: shoppers get a promo-code field on the Stripe page; the
      // owner creates and expires codes in the Stripe dashboard (no code here).
      allow_promotion_codes: true,
      // Legal wording: 'pay' renders an explicit payment button and the Greek
      // payment-obligation notice sits directly under it (EU consumer law).
      submit_type: 'pay',
      custom_text: { submit: { message: 'Παραγγελία με υποχρέωση πληρωμής' } },
      // High-value carts get an explicit 3DS challenge (fraud + liability shift).
      ...(needsStrongAuth(subtotal)
        ? { payment_method_options: { card: { request_three_d_secure: 'any' as const } } }
        : {}),
      metadata: { order_id: order.id },
      success_url: `${SITE}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/cart`,
      shipping_address_collection: {
        allowed_countries: ['GR', 'CY', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'GB', 'US'],
      },
    });
  } catch (e: any) {
    // Stripe rejected the request (e.g. bad key / config). Bin the orphan pending
    // order so we don't accumulate junk, and tell the client cleanly.
    await supabaseAdmin.from('order_items').delete().eq('order_id', order.id);
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    console.error('[checkout] Stripe session create failed:', e?.message ?? e);
    return json({ error: 'Payment could not be started. Please try again shortly.' }, 502);
  }

  await supabaseAdmin.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id);

  return json({ url: session.url });
};
