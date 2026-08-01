// Pure "is this configured?" predicates that drive the graceful "not configured"
// fallback. Kept dependency-free (no import.meta.env, no SDK imports) so they can
// be unit-tested and reused by both stripe.ts and supabase-admin.ts. When these
// return false, checkout answers a friendly 503 and the rest of the site keeps
// working. See tests/ready.test.ts.

/** True once a real Stripe secret key is present (not the .env placeholder). */
export const isStripeSecret = (key: string | undefined | null): boolean =>
  !!key && key.startsWith('sk_');

/** True once a real Supabase service-role/secret key is present (not the placeholder). */
export const isServiceRoleKey = (key: string | undefined | null): boolean =>
  !!key && key.length > 40 && !key.startsWith('__SET_ME__');

/** True once a real Resend API key is present (they all start with re_). */
export const isResendKey = (key: string | undefined | null): boolean =>
  !!key && key.startsWith('re_');
