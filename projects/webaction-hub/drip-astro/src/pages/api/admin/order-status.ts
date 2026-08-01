import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin, adminReady } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';
import { buildShippedEmail, shippingFromSession, type EmailItem } from '@/lib/order-email';

export const prerender = false;

const VALID = ['pending', 'paid', 'fulfilled', 'cancelled', 'refunded'];
const SITE = import.meta.env.PUBLIC_SITE_URL || 'https://drip.store';

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

// Status changes + shipping metadata from /admin. Flipping to 'fulfilled' (this
// store's "shipped") sends the tracking email exactly once: the flip is a
// conditional UPDATE ... WHERE status <> 'fulfilled', so a second click or a
// concurrent admin cannot re-send it. Email failures never block the change.
export const POST: APIRoute = async ({ request, cookies }) => {
  const g = await requireAdmin(cookies, request);
  if (!g.ok) return json({ error: g.error }, g.status);
  if (!adminReady()) return json({ error: 'Server not configured.' }, 503);

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? '');
  const status = String(body?.status ?? '');
  if (!id || !VALID.includes(status)) return json({ error: 'Bad request.' }, 400);

  // Optional tracking fields (they need the tracking_number/courier migration;
  // until it is applied the DB reports the missing column and we answer with a
  // clear hint instead of a raw Postgres error).
  const patch: Record<string, unknown> = { status };
  if (typeof body.tracking_number === 'string') patch.tracking_number = body.tracking_number.trim() || null;
  if (typeof body.courier === 'string') patch.courier = body.courier.trim() || null;

  let flippedToFulfilled = false;
  if (status === 'fulfilled') {
    const { data, error } = await supabaseAdmin
      .from('orders').update(patch).eq('id', id).neq('status', 'fulfilled').select('id');
    if (error) return json({ error: friendly(error.message) }, 500);
    flippedToFulfilled = !!(data && data.length > 0);
    if (!flippedToFulfilled) {
      // Already fulfilled: still allow updating the tracking fields alone.
      const { status: _s, ...rest } = patch;
      if (Object.keys(rest).length) {
        const { error: e2 } = await supabaseAdmin.from('orders').update(rest).eq('id', id);
        if (e2) return json({ error: friendly(e2.message) }, 500);
      }
    }
  } else {
    const { error } = await supabaseAdmin.from('orders').update(patch).eq('id', id);
    if (error) return json({ error: friendly(error.message) }, 500);
  }

  // Shipped email, first flip only. Best-effort by design.
  if (flippedToFulfilled) {
    try {
      const [{ data: order }, { data: items }] = await Promise.all([
        // select('*') stays valid before AND after the tracking migration; the
        // missing columns simply read as undefined until it is applied.
        supabaseAdmin.from('orders').select('*').eq('id', id).single(),
        supabaseAdmin.from('order_items')
          .select('name,brand,size,quantity,unit_price_cents').eq('order_id', id),
      ]);
      if (order?.email && !order.email.endsWith('@drip.local')) {
        await sendEmail({
          to: order.email,
          ...buildShippedEmail(
            {
              orderId: id,
              totalCents: order.total_cents ?? 0,
              shipping: shippingFromSession({ customer_details: order.shipping }),
              trackingNumber: (order as any).tracking_number ?? null,
              courier: (order as any).courier ?? null,
            },
            (items ?? []) as EmailItem[],
            { siteUrl: SITE },
          ),
        });
      }
    } catch (e: any) {
      console.error('[email] shipped email failed (status change unaffected):', e?.message ?? e);
    }
  }

  return json({ ok: true, shippedEmail: flippedToFulfilled });
};

function friendly(msg: string): string {
  return /tracking_number|courier/.test(msg) && /column|schema/i.test(msg)
    ? 'Tracking fields need the pending orders migration (tracking_number, courier).'
    : msg;
}
