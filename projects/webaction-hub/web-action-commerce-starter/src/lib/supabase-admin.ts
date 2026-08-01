import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SERVICE = import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Service-role client — bypasses Row Level Security. SERVER ONLY: only import
 * this from endpoints / server-rendered pages, never from client islands.
 * Used by checkout, the Stripe webhook, inventory writes, and admin reads.
 */
export const supabaseAdmin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** True once a real service-role key is present (not the .env placeholder). */
export const adminReady = () => SERVICE.length > 40 && !SERVICE.startsWith('__SET_ME__');
