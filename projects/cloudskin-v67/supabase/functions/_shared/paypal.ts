// CloudSkin checkout, PayPal integration (Deno edge runtime).
// Mirrors _shared/stripe.ts: the PayPal CLIENT SECRET lives ONLY here, resolved
// via getSecret() (Deno.env first, then app_secrets), and never returned to the
// browser. The CLIENT ID is not secret by PayPal's own design (it is meant to be
// embedded in the JS SDK <script> tag) but we still resolve it server-side via
// the same getSecret() precedence, and expose it to the frontend only through the
// GET /create-paypal-order config route (never hardcoded in the repo).
//
// ENVIRONMENT: PAYPAL_ENV ('sandbox' default | 'live'). Sandbox and live are
// ENTIRELY SEPARATE credential pools at PayPal — a live client id/secret simply
// will not authenticate against the sandbox host and vice versa — so this flag
// only decides which API host we call; it cannot itself cause the wrong
// credentials to be "live" by accident. Mirrors the house rule (Stripe: "test
// mode first, always; live keys and live mode only on Mike's explicit go").
// Defaults to 'sandbox' so a fresh deploy NEVER talks to the live PayPal API
// until Mike explicitly sets PAYPAL_ENV=live.

import { getSecret, getConfig } from './env.ts';

export type PayPalEnv = 'sandbox' | 'live';

export function paypalEnv(): PayPalEnv {
  return getConfig('PAYPAL_ENV', 'sandbox').trim().toLowerCase() === 'live' ? 'live' : 'sandbox';
}

export function paypalApiBase(env: PayPalEnv = paypalEnv()): string {
  return env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

interface CachedToken { token: string; expiresAt: number; env: PayPalEnv; }
let _cached: CachedToken | null = null;

/** OAuth2 client_credentials bearer token, cached in-isolate until ~60s before expiry. */
export async function getPayPalAccessToken(env: PayPalEnv = paypalEnv()): Promise<string | null> {
  if (_cached && _cached.env === env && Date.now() < _cached.expiresAt) return _cached.token;

  const clientId = await getSecret('PAYPAL_CLIENT_ID');
  const clientSecret = await getSecret('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  let res: Response;
  try {
    res = await fetch(`${paypalApiBase(env)}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data?.access_token) return null;
  _cached = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, (Number(data.expires_in) || 300) - 60) * 1000,
    env,
  };
  return data.access_token;
}

/**
 * DIAGNOSTIC ONLY (used once to determine which environment the currently
 * stored PAYPAL_CLIENT_ID/SECRET belong to; exposed permanently as a harmless
 * health-check via GET on create-paypal-order). Tries sandbox then live. Never
 * used on the money-moving hot path, which always trusts the explicit PAYPAL_ENV
 * flag instead — this function's ONLY effect is an OAuth token request (auth
 * only: it creates no order, moves no money). Returns null if neither host
 * accepts the credentials (missing/invalid secrets).
 */
export async function detectPayPalEnv(): Promise<{ env: PayPalEnv; expiresIn: number } | null> {
  const clientId = await getSecret('PAYPAL_CLIENT_ID');
  const clientSecret = await getSecret('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  for (const env of ['sandbox', 'live'] as PayPalEnv[]) {
    try {
      const res = await fetch(`${paypalApiBase(env)}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.access_token) return { env, expiresIn: Number(data.expires_in) || 0 };
      }
    } catch {
      // try the next host
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Orders v2 API
// ---------------------------------------------------------------------------

export interface PayPalOrderResult {
  ok: boolean;
  id?: string;
  status?: string;
  raw?: any;
  error?: string;
}

async function ppFetch(path: string, opts: { method: string; body?: unknown; env?: PayPalEnv; extraHeaders?: Record<string, string> }): Promise<PayPalOrderResult> {
  const env = opts.env ?? paypalEnv();
  const token = await getPayPalAccessToken(env);
  if (!token) return { ok: false, error: 'PayPal is not configured (missing/invalid credentials).' };

  let res: Response;
  try {
    res = await fetch(`${paypalApiBase(env)}${path}`, {
      method: opts.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(opts.extraHeaders || {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    return { ok: false, error: `PayPal request failed: ${(e as Error).message}` };
  }
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const detail = json?.details?.[0]?.issue || json?.message || text.slice(0, 300);
    return { ok: false, error: `PayPal HTTP ${res.status}: ${detail}`, raw: json };
  }
  return { ok: true, id: json?.id, status: json?.status, raw: json };
}

/** Create a PayPal order (intent=CAPTURE). `body` is the full OrderRequest object. */
export function createPayPalOrder(body: unknown, env?: PayPalEnv): Promise<PayPalOrderResult> {
  return ppFetch('/v2/checkout/orders', { method: 'POST', body, env });
}

// --- Webhook management (used ONCE at go-live to register our endpoint,
// server-side, so the client secret is never handled outside the edge runtime). ---

/** List the webhooks registered on the PayPal app (idempotency check before create). */
export function listPayPalWebhooks(env?: PayPalEnv): Promise<PayPalOrderResult> {
  return ppFetch('/v1/notifications/webhooks', { method: 'GET', env });
}

/** Register a webhook. eventTypes is the plain event-name list; PayPal wants [{name}]. */
export function createPayPalWebhook(url: string, eventTypes: string[], env?: PayPalEnv): Promise<PayPalOrderResult> {
  return ppFetch('/v1/notifications/webhooks', {
    method: 'POST',
    env,
    body: { url, event_types: eventTypes.map((name) => ({ name })) },
  });
}

/** Fetch order details (used to re-verify amount + read the buyer's shipping address before capture). */
export function getPayPalOrder(orderId: string, env?: PayPalEnv): Promise<PayPalOrderResult> {
  return ppFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: 'GET', env });
}

/** Capture a buyer-approved order. PayPal-Request-Id makes a client retry idempotent on PayPal's side. */
export function capturePayPalOrder(orderId: string, requestId: string, env?: PayPalEnv): Promise<PayPalOrderResult> {
  return ppFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    env,
    extraHeaders: { 'PayPal-Request-Id': requestId },
  });
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------
// PayPal's documented + recommended method for non-SDK server integrations is
// the /v1/notifications/verify-webhook-signature API call (rather than hand-
// rolling the transmission-id/cert-chain RSA check their own SDKs do
// internally). Deliberate choice over local cert verification:
//   1) PayPal, not us, fetches+validates cert_url against their own CA chain,
//      which removes an SSRF/cert-spoofing surface from OUR code entirely,
//   2) far less custom crypto to get subtly wrong for a security-critical check,
//   3) this is PayPal's own documented approach for exactly this use case.
// Fails CLOSED (returns false) on any missing header, missing PAYPAL_WEBHOOK_ID,
// or a non-SUCCESS verification_status.
export async function verifyPayPalWebhookSignature(
  headers: Headers,
  rawBody: string,
  env?: PayPalEnv,
): Promise<boolean> {
  const webhookId = await getSecret('PAYPAL_WEBHOOK_ID');
  if (!webhookId) return false; // not configured yet -> fail closed, not open

  const transmissionId = headers.get('paypal-transmission-id') ?? '';
  const transmissionTime = headers.get('paypal-transmission-time') ?? '';
  const certUrl = headers.get('paypal-cert-url') ?? '';
  const authAlgo = headers.get('paypal-auth-algo') ?? '';
  const transmissionSig = headers.get('paypal-transmission-sig') ?? '';
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) return false;

  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const result = await ppFetch('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    env,
    body: {
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    },
  });
  if (!result.ok) return false;
  return result.raw?.verification_status === 'SUCCESS';
}
