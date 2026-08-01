// CloudSkin checkout, CORS helper (Deno edge runtime).
// create-checkout-session is called from the browser, so it needs a strict CORS
// allowlist (never "*"). The webhook is called by Stripe (server to server) and
// does not use this. Origins are configurable via env ALLOWED_ORIGINS (comma
// separated); the CloudSkin production + local origins are the built-in defaults.

const DEFAULT_ORIGINS = [
  'https://www.cloudskin.com',
  'https://cloudskin.com',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

function allowedOrigins(): string[] {
  const env = Deno.env.get('ALLOWED_ORIGINS');
  if (!env) return DEFAULT_ORIGINS;
  return env.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Build CORS headers, reflecting the request Origin only when it is allowlisted. */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allow = allowedOrigins();
  const ok = allow.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allow[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/** True when the request Origin is on the allowlist (used to reject cross-site POSTs). */
export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get('Origin') ?? '';
  // No Origin header (server-to-server / same-origin GET) is not a browser CSRF
  // vector for this JSON endpoint; only reject a PRESENT, non-allowlisted origin.
  return origin === '' || allowedOrigins().includes(origin);
}
