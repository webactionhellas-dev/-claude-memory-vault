import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// CLOUDSKIN - DHL Shipment Tracking (Unified) proxy.
//   The browser POSTs { trackingNumber, service? } and gets back a compact status the
//   order page / account can render. The DHL API key stays SERVER-SIDE (never shipped to
//   the browser). It degrades gracefully (ok:false + a reason) so the UI keeps the existing
//   Shopify tracking link whenever the key is missing, the DHL API is still PENDING approval,
//   the rate limit is hit, or DHL returns nothing. The store is never left without a path.
//
//   Live the moment DHL activates the "Shipment Tracking - Unified" API for the CloudSkin
//   Tracking app (currently pending). Deploy: supabase functions deploy dhl-track.
//   Secrets it reads (Deno.env first, then the app_secrets table, house pattern):
//     DHL_API_KEY  (required)   the app's API Key
//     DHL_TRACK_BASE (optional) defaults to https://api-eu.dhl.com (Production Europe)

const DHL_BASE = Deno.env.get("DHL_TRACK_BASE") || "https://api-eu.dhl.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

let _admin: SupabaseClient | null = null;
function serviceClient(): SupabaseClient {
  if (!_admin) _admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });
  return _admin;
}

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Deno.env first, then app_secrets (service-role client). Cached per isolate. Same pattern
// as cloudskin-notify so secret handling stays consistent across the CloudSkin functions.
const secretCache = new Map<string, string>();
async function getSecret(key: string): Promise<string> {
  if (secretCache.has(key)) return secretCache.get(key)!;
  const fromEnv = Deno.env.get(key);
  if (fromEnv) { secretCache.set(key, fromEnv); return fromEnv; }
  try {
    const { data } = await serviceClient().from("app_secrets").select("value").eq("key", key).maybeSingle();
    const val = data?.value ?? "";
    if (val) secretCache.set(key, val);
    return val;
  } catch {
    return "";
  }
}

// Compact the DHL Unified response into the small shape the UI renders.
function compact(dhl: any) {
  const s = dhl && Array.isArray(dhl.shipments) ? dhl.shipments[0] : null;
  if (!s) return null;
  const status = s.status || {};
  const loc = (o: any) =>
    (o && o.location && o.location.address && (o.location.address.addressLocality || o.location.address.countryCode)) || "";
  const events = Array.isArray(s.events)
    ? s.events.slice(0, 12).map((e: any) => ({
        status: e.status || e.description || "",
        timestamp: e.timestamp || "",
        location: loc(e),
      }))
    : [];
  return {
    trackingNumber: s.id || "",
    statusCode: status.statusCode || "",            // pre-transit | transit | delivered | failure | unknown
    status: status.status || status.description || "",
    timestamp: status.timestamp || "",
    location: loc(status),
    estimatedDelivery: s.estimatedTimeOfDelivery || (s.estimatedDeliveryTimeFrame && s.estimatedDeliveryTimeFrame.estimatedThrough) || "",
    events,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const trackingNumber = String(body.trackingNumber || "").trim();
  if (!/^[A-Za-z0-9\-]{6,40}$/.test(trackingNumber)) return json({ ok: false, error: "invalid tracking number" }, 400);

  const apiKey = await getSecret("DHL_API_KEY");
  // No key yet, or DHL has not activated the API: degrade so the UI shows the Shopify link.
  if (!apiKey) return json({ ok: false, error: "tracking unavailable", reason: "no_key" });

  const service = String(body.service || "").trim();          // optional: express | parcel-de | ...
  const lang = String(body.language || "en").trim().slice(0, 2).toLowerCase();
  const url = new URL(DHL_BASE.replace(/\/$/, "") + "/track/shipments");
  url.searchParams.set("trackingNumber", trackingNumber);
  if (service) url.searchParams.set("service", service);
  if (lang) url.searchParams.set("language", lang);

  try {
    const res = await fetch(url.toString(), { headers: { "DHL-API-Key": apiKey, "Accept": "application/json" } });
    if (res.status === 401 || res.status === 403) return json({ ok: false, error: "tracking unavailable", reason: "api_pending" });
    if (res.status === 404) return json({ ok: false, error: "no tracking data", reason: "no_data" });
    if (res.status === 429) return json({ ok: false, error: "rate limited", reason: "rate_limit" });
    if (!res.ok) return json({ ok: false, error: "dhl error " + res.status, reason: "dhl_error" });
    const data = await res.json();
    const tracking = compact(data);
    if (!tracking) return json({ ok: false, error: "no tracking data", reason: "no_data" });
    return json({ ok: true, tracking });
  } catch (e) {
    return json({ ok: false, error: String((e && (e as Error).message) || e), reason: "network" }, 500);
  }
});
