// CloudSkin checkout, Stripe client factory (Deno edge runtime).
// The Stripe SECRET key lives ONLY here, server-side. It is read via getSecret()
// (Deno.env or app_secrets) and never returned to the browser.
//
// Deno gotchas handled here:
//  * use Stripe.createFetchHttpClient() so stripe-node uses Deno's fetch,
//  * verify webhooks with constructEventAsync() + createSubtleCryptoProvider()
//    (the sync constructEvent uses Node crypto and throws under Deno).

import Stripe from 'npm:stripe@^17';
import { getSecret } from './env.ts';

// Pin an API version so behaviour is stable across Stripe upgrades.
export const STRIPE_API_VERSION = '2025-01-27.acacia';

let _stripe: Stripe | null = null;
let _key = '';

/** Build (once) the Stripe client. Returns null when no secret key is configured. */
export async function getStripe(): Promise<Stripe | null> {
  if (_stripe) return _stripe;
  const key = await getSecret('STRIPE_SECRET_KEY');
  if (!key) return null;
  _key = key;
  _stripe = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION as any,
    httpClient: Stripe.createFetchHttpClient(),
  });
  return _stripe;
}

/** True when running against Stripe live keys (extra caution / logging). */
export function isLiveKey(): boolean {
  return _key.startsWith('sk_live_');
}

/**
 * Verify + parse a Stripe webhook using the async SubtleCrypto path required by
 * Deno. Throws if the signature is invalid (caller returns 400).
 */
export async function constructEvent(
  stripe: Stripe,
  rawBody: string,
  signature: string,
  webhookSecret: string,
): Promise<Stripe.Event> {
  const provider = Stripe.createSubtleCryptoProvider();
  return await stripe.webhooks.constructEventAsync(
    rawBody,
    signature,
    webhookSecret,
    undefined,
    provider,
  );
}

export type { Stripe };
