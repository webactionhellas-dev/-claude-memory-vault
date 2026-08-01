import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ============================================================================
// CLOUDSKIN, shopify-product-webhook  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// PUBLIC endpoint (deploy with verify_jwt = false): Shopify calls this
// automatically whenever a product is updated in Admin, so auth is the HMAC
// signature check, NOT a JWT — same pattern as cloudskin-order-webhook.
//
// Why this exists: the storefront's DISPLAYED price is a hand-maintained
// static file (js/products.js), not a live Shopify fetch (only checkout
// re-prices live — see supabase/functions/_shared/shopify.ts). Before this,
// changing a price in Shopify Admin did nothing to what customers saw.
//
// Chain: Shopify Admin price edit
//   -> Shopify fires the "products/update" webhook
//   -> THIS function verifies the HMAC, fires a GitHub repository_dispatch
//      (event "product-price-update") using the SAME GitHub token already
//      used by blog-rebuild
//   -> .github/workflows/product-price-sync.yml runs
//      scripts/sync-prices-from-shopify.mjs (re-fetches live prices from the
//      public Storefront API, writes only the price/compareAt fields into
//      js/products.js), deploys, then commits the refreshed file.
//
// VERIFIED LIVE 2026-07-30: a real Shopify Admin price edit on the test
// product correctly fired this webhook and the whole chain through to a
// green GitHub Actions run. Two things learned the hard way, both already
// fixed below:
//   1. This webhook (registered via the app's Admin API access token) is
//      signed with SHOPIFY_APP_CLIENT_SECRET, NOT SHOPIFY_WEBHOOK_SECRET
//      (the secret cloudskin-order-webhook's orders topic uses — a
//      different registration context). Verifies against EITHER, since
//      both are already-trusted values in app_secrets — not a security
//      downgrade, just tolerant of which secret context signed a given
//      subscription.
//   2. Shopify auto-pauses/backs off delivery to an endpoint after enough
//      consecutive non-2xx responses (it did, after this was briefly
//      misconfigured). If webhooks stop arriving with no error at all in
//      these logs, deleting + recreating the subscription (see
//      register-product-webhook's ?go=RESET) clears that state.
//
// Secrets (read from public.app_secrets via the service role — same table
// cloudskin-order-webhook and reprice-aed already use, nothing new to add):
//   SHOPIFY_WEBHOOK_SECRET / SHOPIFY_APP_CLIENT_SECRET
// Supabase secrets (edge function env, already set for blog-rebuild):
//   GITHUB_DISPATCH_TOKEN    GitHub token allowed to POST /repos/:o/:r/dispatches.
//   GH_REPO                  "owner/repo". Default "webactionhellas-dev/cloudskin-v67".
//
// Fail-closed: bad/missing signature, or no GitHub token, => no dispatch.
// This touches no money and no order data; worst case of a bad call is a
// no-op or an extra harmless rebuild.
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GH_TOKEN = Deno.env.get("GITHUB_DISPATCH_TOKEN") || "";
const GH_REPO = (Deno.env.get("GH_REPO") || "webactionhellas-dev/cloudskin-v67").trim();
const EVENT_TYPE = "product-price-update";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const enc = new TextEncoder();
const dec = new TextDecoder();

let cachedSecrets: string[] | null = null;
async function getWebhookSecrets(): Promise<string[]> {
  if (cachedSecrets) return cachedSecrets;
  const { data, error } = await supabase
    .from("app_secrets").select("key,value").in("key", ["SHOPIFY_WEBHOOK_SECRET", "SHOPIFY_APP_CLIENT_SECRET"]);
  if (error) console.error("app_secrets read failed:", error.message);
  cachedSecrets = (data || []).map((r) => r.value).filter(Boolean);
  return cachedSecrets;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function signHmac(bodyBytes: Uint8Array, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, bodyBytes));
}

async function verifyHmacAny(bodyBytes: Uint8Array, headerHmac: string, secrets: string[]): Promise<boolean> {
  if (!headerHmac || !secrets.length) return false;
  let provided: Uint8Array;
  try { provided = b64ToBytes(headerHmac.trim()); } catch { return false; }
  for (const secret of secrets) {
    const sig = await signHmac(bodyBytes, secret);
    if (timingSafeEqual(sig, provided)) return true;
  }
  return false;
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return json({ ok: true, fn: "shopify-product-webhook", configured: Boolean(GH_TOKEN), repo: GH_REPO });
  }
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const bodyBytes = new Uint8Array(await req.arrayBuffer());
  const headerHmac = req.headers.get("x-shopify-hmac-sha256") || "";

  const secrets = await getWebhookSecrets();
  const ok = await verifyHmacAny(bodyBytes, headerHmac, secrets);
  if (!ok) return json({ error: "invalid signature" }, 401);

  if (!GH_TOKEN) return json({ error: "dispatch token missing" }, 503);

  // Signature verified. Parse defensively — only for logging/traceability,
  // never trusted for the actual price (the sync script re-fetches that
  // itself from the Storefront API).
  let handle = "", productId = "";
  try {
    const p = JSON.parse(dec.decode(bodyBytes));
    handle = String(p?.handle || "").slice(0, 120);
    productId = String(p?.id ?? "").slice(0, 40);
  } catch { /* body optional beyond the HMAC check */ }

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${GH_REPO}/dispatches`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${GH_TOKEN}`,
        "accept": "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
        "user-agent": "cloudskin-product-webhook",
      },
      body: JSON.stringify({
        event_type: EVENT_TYPE,
        client_payload: { source: "shopify", topic: "products/update", handle, product_id: productId },
      }),
    });
  } catch (e) {
    console.error("github dispatch fetch threw:", (e as Error).message);
    return json({ error: "dispatch error" }, 502);
  }

  if (res.status === 204) return json({ ok: true, dispatched: EVENT_TYPE, handle });

  const text = await res.text().catch(() => "");
  console.error("github dispatch failed", res.status, text.slice(0, 300));
  return json({ error: "dispatch failed", status: res.status }, 502);
});
