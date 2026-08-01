import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// TEMPORARY diagnostic utility used 2026-07-30 to prove the product-price
// auto-sync pipeline (shopify-product-webhook + product-price-sync.yml) fires
// on a REAL Shopify price edit, not just a manual GitHub Actions run. Safe to
// delete from the Supabase dashboard whenever — kept here only so it's
// documented rather than a mystery deployed function.
//
// Touches ONLY the dedicated test product (handle "test-product", the
// EUR/AED 1 "Test Checkout" item) via the Admin API. Never a real product.
//
// GET  <url>              show the test product's current price
// POST <url>?to=<price>   set its price to <price>
//
// Also exposes ?diag=1: compares SHOPIFY_WEBHOOK_SECRET vs
// SHOPIFY_APP_CLIENT_SECRET presence/length/equality server-side, without
// ever returning either value — this is how the wrong-signing-secret bug
// (fixed in shopify-product-webhook) was found.

const DOMAIN = "rta3sf-47.myshopify.com";
const API_VERSION = "2025-01";
const TEST_HANDLE = "test-product";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.searchParams.get("diag") === "1") {
    const [a, b, c] = await Promise.all([
      supabase.from("app_secrets").select("value").eq("key", "SHOPIFY_WEBHOOK_SECRET").maybeSingle(),
      supabase.from("app_secrets").select("value").eq("key", "SHOPIFY_APP_CLIENT_SECRET").maybeSingle(),
      supabase.from("app_secrets").select("key").like("key", "%SHOPIFY%"),
    ]);
    const webhookSecret = a.data?.value ?? "";
    const clientSecret = b.data?.value ?? "";
    return json({
      webhookSecretPresent: Boolean(webhookSecret),
      webhookSecretLength: webhookSecret.length,
      clientSecretPresent: Boolean(clientSecret),
      clientSecretLength: clientSecret.length,
      secretsAreEqual: Boolean(webhookSecret) && webhookSecret === clientSecret,
      allShopifyKeysInAppSecrets: (c.data || []).map((r: any) => r.key),
    });
  }

  const { data } = await supabase.from("app_secrets").select("value").eq("key", "SHOPIFY_ADMIN_TOKEN").maybeSingle();
  const token = data?.value ?? "";
  if (!token) return json({ error: "no admin token" }, 500);
  const H = { "X-Shopify-Access-Token": token, "Content-Type": "application/json" };

  const pr = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/products.json?handle=${TEST_HANDLE}`, { headers: H });
  if (!pr.ok) return json({ error: "product fetch failed", status: pr.status }, 502);
  const products = (await pr.json()).products || [];
  const product = products[0];
  if (!product) return json({ error: "test product not found by handle " + TEST_HANDLE }, 404);
  const variant = product.variants?.[0];

  const to = url.searchParams.get("to");
  if (req.method !== "POST" || !to) {
    return json({ ok: true, handle: TEST_HANDLE, variantId: variant?.id, currentPrice: variant?.price });
  }

  const ur = await fetch(`https://${DOMAIN}/admin/api/${API_VERSION}/variants/${variant.id}.json`, {
    method: "PUT", headers: H, body: JSON.stringify({ variant: { id: variant.id, price: to } }),
  });
  const body = await ur.json().catch(() => ({}));
  if (!ur.ok) return json({ error: "update failed", status: ur.status, body }, 502);

  return json({ ok: true, handle: TEST_HANDLE, before: variant.price, after: to });
});
