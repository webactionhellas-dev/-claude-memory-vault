import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { supabaseAdmin, adminReady } from '@/lib/supabase-admin';

export const prerender = false;

const VALID = ['pending', 'paid', 'fulfilled', 'cancelled', 'refunded'];
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = supabaseServer(cookies, request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Not signed in.' }, 401);

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return json({ error: 'Forbidden.' }, 403);
  if (!adminReady()) return json({ error: 'Server not configured.' }, 503);

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id ?? '');
  const status = String(body?.status ?? '');
  if (!id || !VALID.includes(status)) return json({ error: 'Bad request.' }, 400);

  const { error } = await supabaseAdmin.from('orders').update({ status }).eq('id', id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
};
