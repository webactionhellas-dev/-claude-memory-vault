import type { APIRoute } from 'astro';
import { supabaseAdmin, adminReady } from '@/lib/supabase-admin';
import { stripe, stripeReady } from '@/lib/stripe';
import { fulfilCheckoutSession, cleanupExpiredCheckout } from '@/lib/fulfil-order';
import { sendEmail, ownerNotifyEmail } from '@/lib/email';

export const prerender = false;

// Safety net for lost webhooks: every 6h (vercel.json crons) look at orders
// stuck in 'pending' for over 2 hours that DO have a Checkout Session, ask
// Stripe what actually happened, and reconcile:
//   paid            -> run the exact same idempotent fulfilment as the webhook
//   session expired -> delete the abandoned pending order (items cascade)
// Guarded by CRON_SECRET exactly like the sync cron; Vercel sends
// `Authorization: Bearer <CRON_SECRET>`.
const CRON_SECRET = import.meta.env.CRON_SECRET || '';
const STUCK_AFTER_MS = 2 * 60 * 60 * 1000;
const BATCH = 25;

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

async function run(request: Request): Promise<Response> {
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization') || '';
    if (auth !== `Bearer ${CRON_SECRET}`) return json({ error: 'Unauthorized' }, 401);
  }
  if (!adminReady() || !stripeReady()) return json({ error: 'Store not configured.' }, 503);

  const cutoff = new Date(Date.now() - STUCK_AFTER_MS).toISOString();
  const { data: stuck, error } = await supabaseAdmin
    .from('orders')
    .select('id,stripe_session_id,created_at')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .not('stripe_session_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(BATCH);
  if (error) return json({ ok: false, error: error.message }, 500);

  const results = { checked: 0, reconciled: 0, cleaned: 0, stillOpen: 0, errors: 0 };
  const owner = ownerNotifyEmail();

  for (const o of stuck ?? []) {
    results.checked++;
    try {
      const session = await stripe.checkout.sessions.retrieve(o.stripe_session_id as string);
      const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
      if (paid) {
        const r = await fulfilCheckoutSession(session, o.id);
        if (r.fulfilled) {
          results.reconciled++;
          console.log(`[reconcile] stuck order ${o.id} was PAID at Stripe; fulfilled now`);
          if (owner) {
            try {
              await sendEmail({
                to: owner,
                subject: `Reconciled a stuck order · #${String(o.id).slice(0, 8).toUpperCase()}`,
                html: '<p>Μια παραγγελία ήταν πληρωμένη στο Stripe αλλά κολλημένη σε pending (χαμένο webhook). Ολοκληρώθηκε αυτόματα από το reconcile cron: απόθεμα και emails εκτελέστηκαν κανονικά.</p>',
                text: 'A paid order was stuck pending (lost webhook) and has been fulfilled by the reconcile cron.',
              });
            } catch { /* alert is best-effort */ }
          }
        }
      } else if (session.status === 'expired') {
        const { deleted } = await cleanupExpiredCheckout(o.id);
        if (deleted) results.cleaned++;
      } else {
        results.stillOpen++; // session still open / payment processing: leave it
      }
    } catch (e: any) {
      results.errors++;
      console.error(`[reconcile] order ${o.id}:`, e?.message ?? e);
    }
  }

  return json({ ok: true, ...results });
}

// Vercel Cron uses GET; POST allowed for manual triggers.
export const GET: APIRoute = ({ request }) => run(request);
export const POST: APIRoute = ({ request }) => run(request);
