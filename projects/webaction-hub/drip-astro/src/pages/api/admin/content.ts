import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin, adminReady } from '@/lib/supabase-admin';
import { ADMIN_EDITABLE } from '@/lib/store-config';
import { invalidateContent } from '@/lib/content';

export const prerender = false;

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

async function guard(cookies: any, request: Request) {
  const g = await requireAdmin(cookies, request);
  if (!g.ok) return json({ error: g.error }, g.status);
  if (!adminReady()) return json({ error: 'Server not configured.' }, 503);
  if (!ADMIN_EDITABLE) return json({ error: 'Editing is disabled for this store.' }, 409);
  return null;
}

export const GET: APIRoute = async ({ cookies, request }) => {
  const bad = await guard(cookies, request);
  if (bad) return bad;
  const { data, error } = await supabaseAdmin
    .from('site_content')
    .select('key,section,label,el,en')
    .order('section', { ascending: true })
    .order('key', { ascending: true });
  if (error) return json({ error: error.message }, 500);
  return json({ items: data });
};

export const PATCH: APIRoute = async ({ cookies, request }) => {
  const bad = await guard(cookies, request);
  if (bad) return bad;
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.items)) return json({ error: 'Expected { items: [{ key, el, en }] }' }, 400);

  let updated = 0;
  for (const it of body.items) {
    if (!it || typeof it.key !== 'string') continue;
    const { error } = await supabaseAdmin
      .from('site_content')
      .update({ el: String(it.el ?? ''), en: String(it.en ?? ''), updated_at: new Date().toISOString() })
      .eq('key', it.key);
    if (!error) updated++;
  }
  invalidateContent();
  return json({ ok: true, updated });
};
