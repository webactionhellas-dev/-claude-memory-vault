// Shared owner/admin gate for server-rendered admin pages and API routes.
import type { AstroCookies } from 'astro';
import { supabaseServer } from './supabase';

export interface AdminCheck {
  ok: boolean;
  status: number;
  error?: string;
  user?: { id: string; email?: string };
}

export async function requireAdmin(cookies: AstroCookies, request: Request): Promise<AdminCheck> {
  const supabase = supabaseServer(cookies, request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Not signed in.' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { ok: false, status: 403, error: 'Forbidden.' };
  return { ok: true, status: 200, user: { id: user.id, email: user.email } };
}
