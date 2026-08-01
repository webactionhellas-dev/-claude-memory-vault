import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ============================================================================
// CLOUDSKIN, register-product-webhook  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// ONE-SHOT admin utility: registers (or reports) the Shopify "products/update"
// webhook subscription that points at shopify-product-webhook.
//
// Holds SHOPIFY_ADMIN_TOKEN only inside this isolate, read from
// public.app_secrets with the service role (same secret reprice-aed already
// uses) — never returned in the response, never logged.
//
// Usage:
//   GET  <url>              list current product webhooks + what would happen
//   POST <url>?go=REGISTER  create the subscription (no-op if one already exists)
//   POST <url>?go=RESET     delete the existing subscription and recreate it —
//                           use this if webhooks silently stop arriving with NO
//                           error at all in shopify-product-webhook's logs.
//                           Shopify auto-pauses delivery to an endpoint after
//                           enough consecutive failures; a fresh subscription
//                           id clears that state. (This happened once, 2026-07-30,
//                           right after this was first wired up with the wrong
//                           signing secret — see shopify-product-webhook's header.)
// ============================================================================

const DOMAIN = "rta3sf-47.myshopify.com";
const API_VERSION = "2025-01";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), { status, headers: { "Content-Type": "application/json" } });

async function getAdminToken(): Promise<string> {
  const { data, error } = await supabase
    .from("app_secrets").select("value").eq("key", "SHOPIFY_ADMIN_TOKEN").maybeSingle();
  if (error) console.error("app_secrets read failed:", error.message);
  return data?.value ?? "";
}

Deno.serve(async (req: Request) => {
  const token = await getAdminToken();
  if (!token) return json({ error: "SHOPIFY_ADMIN_TOKEN not set in app_secrets" }, 500);

  const H = { "X-Shopify-Access-Token": token, "Content-Type": "application/json" };
  const url = new URL(req.url);
  const targetAddress = `${Deno.env.get("SUPABASE_URL")}/functions/v1/shopify-product-webhook`;

  const listRes = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/webhooks.json?topic=products/update`, { headers: H });
  if (!listRes.ok) return json({ error: "list webhooks failed", status: listRes.status }, 502);
  const existing = ((await listRes.json()).webhooks || []) as Array<{ id: number; address: string }>;
  const already = existing.find((w) => w.address === targetAddress);

  const action = url.searchParams.get("go");

  if (req.method === "POST" && action === "RESET" && already) {
    const delRes = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/webhooks/${already.id}.json`, { method: "DELETE", headers: H });
    if (!delRes.ok) return json({ error: "delete failed", status: delRes.status }, 502);
    const createRes = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/webhooks.json`, {
      method: "POST", headers: H,
      body: JSON.stringify({ webhook: { topic: "products/update", address: targetAddress, format: "json" } }),
    });
    const body = await createRes.json().catch(() => ({}));
    if (!createRes.ok) return json({ error: "recreate failed", status: createRes.status, body }, 502);
    return json({ ok: true, status: "reset (deleted old, created fresh)", webhook: body.webhook });
  }

  if (already) {
    return json({ ok: true, status: "already registered", webhookId: already.id, address: targetAddress });
  }

  const go = req.method === "POST" && action === "REGISTER";
  if (!go) {
    return json({
      ok: true, status: "DRY RUN — would create", targetAddress,
      existingProductUpdateWebhooks: existing.map((w) => ({ id: w.id, address: w.address })),
      toApply: "POST this same URL with ?go=REGISTER",
    });
  }

  const createRes = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/webhooks.json`, {
    method: "POST", headers: H,
    body: JSON.stringify({ webhook: { topic: "products/update", address: targetAddress, format: "json" } }),
  });
  const body = await createRes.json().catch(() => ({}));
  if (!createRes.ok) return json({ error: "create failed", status: createRes.status, body }, 502);

  return json({ ok: true, status: "registered", webhook: body.webhook });
});
