// CloudSkin checkout, secrets + config loader (Deno edge runtime).
// Secret precedence mirrors the existing cloudskin-order-webhook house pattern:
//   1) Deno.env.get(KEY)                          (Supabase function secret)
//   2) public.app_secrets row where key = KEY     (read with the service role)
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically by Supabase.
// Nothing here ever reaches the browser: these functions run server-side only and
// the service-role key + Stripe secret never appear in any response body.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

let _admin: SupabaseClient | null = null;

/** The service-role Supabase client (bypasses RLS). Server-side only. */
export function serviceClient(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

// Cache resolved secrets for the lifetime of the isolate (avoid a DB read per call).
const secretCache = new Map<string, string>();

/** Resolve a secret by precedence: Deno.env first, then app_secrets. '' if unset. */
export async function getSecret(key: string): Promise<string> {
  if (secretCache.has(key)) return secretCache.get(key)!;
  const fromEnv = Deno.env.get(key);
  if (fromEnv) {
    secretCache.set(key, fromEnv);
    return fromEnv;
  }
  try {
    const { data, error } = await serviceClient()
      .from('app_secrets').select('value').eq('key', key).maybeSingle();
    if (error) console.error(`[env] app_secrets read failed for ${key}:`, error.message);
    const val = data?.value ?? '';
    secretCache.set(key, val);
    return val;
  } catch (e) {
    console.error(`[env] app_secrets lookup threw for ${key}:`, (e as Error).message);
    return '';
  }
}

/** Non-secret config from Deno.env with a default (safe to expose in logs). */
export function getConfig(key: string, fallback = ''): string {
  return Deno.env.get(key) ?? fallback;
}

export function serviceReady(): boolean {
  return SUPABASE_URL !== '' && SERVICE_ROLE !== '';
}
