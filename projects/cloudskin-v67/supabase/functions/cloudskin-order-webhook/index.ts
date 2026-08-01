import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CLOUDSKIN — Shopify order webhook -> Supabase mirror (public/verify_jwt=false).
// Shopify (not a logged-in user) calls this, so auth is the HMAC signature check, NOT a JWT.
// Serves the orders/create, orders/updated and orders/fulfilled topics (all send an order payload).
//
// Secret precedence:
//   1) Deno.env.get("SHOPIFY_WEBHOOK_SECRET")  (set this in the dashboard later to override)
//   2) public.app_secrets row key='SHOPIFY_WEBHOOK_SECRET' (read with the service role)
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically by Supabase.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const enc = new TextEncoder();
const dec = new TextDecoder();

// Cache the resolved secret for the lifetime of the isolate (avoids a DB read per request).
let cachedSecret = "";
async function getWebhookSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  const envSecret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
  if (envSecret) {
    cachedSecret = envSecret;
    return cachedSecret;
  }
  const { data, error } = await supabase
    .from("app_secrets")
    .select("value")
    .eq("key", "SHOPIFY_WEBHOOK_SECRET")
    .maybeSingle();
  if (error) console.error("app_secrets read failed:", error.message);
  cachedSecret = data?.value ?? "";
  return cachedSecret;
}

// base64 (Shopify header) -> bytes
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// constant-time compare (short-circuits only on mismatched length)
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyHmac(bodyBytes: Uint8Array, headerHmac: string, secret: string): Promise<boolean> {
  if (!headerHmac || !secret) return false;
  let provided: Uint8Array;
  try {
    provided = b64ToBytes(headerHmac.trim());
  } catch {
    return false; // header wasn't valid base64
  }
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, bodyBytes));
  return timingSafeEqual(sig, provided);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Map a raw Shopify order payload to a customer_orders row. Every field is defensive.
function mapOrder(order: any) {
  const id = order?.id;
  const email = String(order?.email || order?.customer?.email || "").toLowerCase().trim();

  const line_items = Array.isArray(order?.line_items)
    ? order.line_items.map((li: any) => ({
        title: li?.title ?? null,
        quantity: li?.quantity ?? null,
        variant: li?.variant_title ?? null,
      }))
    : null;

  const f = Array.isArray(order?.fulfillments) && order.fulfillments.length > 0
    ? order.fulfillments[0]
    : null;
  const tracking = f
    ? {
        number: f?.tracking_number ?? null,
        url: f?.tracking_url ?? null,
        company: f?.tracking_company ?? null,
      }
    : null;

  return {
    id,
    email,
    row: {
      shopify_order_id: id,
      email,
      order_name: order?.name ?? null,
      processed_at: order?.created_at ?? null,
      currency: order?.currency ?? null,
      total_price: num(order?.total_price),
      financial_status: order?.financial_status ?? null,
      fulfillment_status: order?.fulfillment_status ?? null,
      line_items,
      tracking,
      updated_at: new Date().toISOString(),
    },
  };
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Read the RAW body bytes ONCE — required both for HMAC (over exact bytes) and JSON parse.
  const bodyBytes = new Uint8Array(await req.arrayBuffer());
  const headerHmac = req.headers.get("x-shopify-hmac-sha256") || "";

  const secret = await getWebhookSecret();
  const ok = await verifyHmac(bodyBytes, headerHmac, secret);
  if (!ok) {
    // Unverified: write nothing, tell Shopify it was rejected.
    return json({ error: "invalid signature" }, 401);
  }

  // Signature verified. Parse defensively.
  let order: any;
  try {
    order = JSON.parse(dec.decode(bodyBytes));
  } catch {
    // Verified but unparseable -> 200 so Shopify doesn't retry forever.
    return json({ ok: true, skipped: "unparseable body" }, 200);
  }

  const { id, email, row } = mapOrder(order);

  // No order id -> cannot upsert on the primary key. Ack so Shopify stops retrying.
  if (id === null || id === undefined) {
    return json({ ok: true, skipped: "no order id" }, 200);
  }
  // No email -> we can't attribute the order to a customer. Ack (skip) so Shopify stops retrying.
  if (!email) {
    return json({ ok: true, skipped: "no email" }, 200);
  }

  const { error } = await supabase
    .from("customer_orders")
    .upsert(row, { onConflict: "shopify_order_id" });

  if (error) {
    // Real write failure -> 500 so Shopify retries later (webhook is idempotent via upsert).
    console.error("upsert failed:", error.message);
    return json({ error: "upsert failed" }, 500);
  }

  return json({ ok: true, shopify_order_id: id });
});
