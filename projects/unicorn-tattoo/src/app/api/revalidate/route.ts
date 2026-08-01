import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { CMS_TAG } from '@/lib/cms/data';

/**
 * On-demand cache revalidation, called by the admin panel after every save.
 *
 * Security model (least privilege, no service-role key anywhere):
 * 1. The caller sends their Supabase session JWT as a Bearer token.
 * 2. We ask Supabase Auth who the token belongs to.
 * 3. We check that this user has a row in admin_users, using the caller's own
 *    token against PostgREST - RLS only lets a user read their own row, so a
 *    non-admin token yields zero rows and a 403.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const env = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ''),
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
  if (!env.url || !env.anon) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const userRes = await fetch(`${env.url}/auth/v1/user`, {
      headers: { apikey: env.anon, Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    if (!userRes.ok) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const user = (await userRes.json()) as { id?: string };
    if (!user.id || !UUID_RE.test(user.id)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const adminRes = await fetch(
      `${env.url}/rest/v1/admin_users?select=user_id&user_id=eq.${user.id}`,
      {
        headers: { apikey: env.anon, Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      }
    );
    const rows = adminRes.ok ? ((await adminRes.json()) as unknown[]) : [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  } catch {
    // Generic failure to the client - no internals leak.
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  revalidateTag(CMS_TAG);
  return NextResponse.json({ ok: true, revalidated: true });
}
