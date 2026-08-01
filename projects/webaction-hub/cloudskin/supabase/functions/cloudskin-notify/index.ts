import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// CLOUDSKIN - notification emails via Resend.
//   type "signup"  -> owner alert for a new account (verified against Supabase Auth)
//   type "contact" -> owner alert for a contact-form message (honeypot guarded)
//   type "welcome" -> CUSTOMER email delivering the WELCOME10 code the popup
//                     promises (10% off the first order). Rate limited per IP so
//                     the open endpoint cannot be used to spam arbitrary inboxes.
// Secret resolution follows the house pattern: Deno.env first, then the
// app_secrets table read via the supabase-js SERVICE-ROLE client (same as the
// other edge functions). RESEND_API_KEY lives in the Supabase function secrets.

const EMAIL_TO = Deno.env.get("EMAIL_TO") || "info@cloudskin.com";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "CLOUDSKIN <onboarding@resend.dev>";
// The customer-facing sender. The cloudskin.com domain is verified in Resend, so
// default to it; EMAIL_FROM_WELCOME overrides, and a non-default EMAIL_FROM wins
// over the hardcoded fallback.
const EMAIL_FROM_WELCOME = Deno.env.get("EMAIL_FROM_WELCOME") ||
  (EMAIL_FROM.includes("resend.dev") ? "CLOUDSKIN <hello@cloudskin.com>" : EMAIL_FROM);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Keep in step with the live Stripe promotion code and js/welcome.js.
const WELCOME_CODE = "WELCOME10";

// Service-role Supabase client (bypasses RLS). Server-side only; built once.
let _admin: SupabaseClient | null = null;
function serviceClient(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) =>
  String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

// Deno.env first, then app_secrets (service-role client). Cached per isolate.
const secretCache = new Map<string, string>();
async function getSecret(key: string): Promise<string> {
  if (secretCache.has(key)) return secretCache.get(key)!;
  const fromEnv = Deno.env.get(key);
  if (fromEnv) { secretCache.set(key, fromEnv); return fromEnv; }
  try {
    const { data } = await serviceClient()
      .from("app_secrets").select("value").eq("key", key).maybeSingle();
    const val = data?.value ?? "";
    if (val) secretCache.set(key, val);
    return val;
  } catch {
    return "";
  }
}

async function sendEmail(subject: string, html: string, replyTo?: string, to?: string) {
  const apiKey = await getSecret("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: to ? EMAIL_FROM_WELCOME : EMAIL_FROM,
      to: [to || EMAIL_TO],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${txt}`);
  return txt;
}

// Per-IP throttle reusing the checkout rate-hit RPC (separate bucket via prefix).
// Best-effort: if the RPC is unavailable the send proceeds (never dead-end a customer).
async function rateOk(bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE) return true;
  try {
    const { data, error } = await serviceClient().rpc("stripe_checkout_rate_hit", {
      p_ip: bucket, p_max: max, p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

// Customer welcome email. Editorial CloudSkin look, email-safe (table layout,
// inline styles, web-safe fonts echoing the site's Inter + Fraunces-italic).
// Palette is the exact site tokens: paper #f7f4ef, oat #efeae1, ink #171512,
// stone #857d72, hairline #e6e0d6 / #d8d0c3. No em-dashes (house rule).
function welcomeHtml(): string {
  return (
    `<div style="margin:0;padding:0;background:#f7f4ef;">` +
    `<div style="background:#f7f4ef;padding:40px 16px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">` +
      `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e6e0d6;border-collapse:separate;">` +
        `<tr><td style="padding:46px 48px 0;text-align:center;">` +
          `<div style="font-size:15px;letter-spacing:.42em;color:#171512;font-weight:600;text-transform:uppercase;">CLOUDSKIN</div>` +
          `<div style="height:1px;line-height:1px;font-size:0;background:#e6e0d6;margin:28px 0 0;">&nbsp;</div>` +
        `</td></tr>` +
        `<tr><td style="padding:34px 48px 0;text-align:center;">` +
          `<div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:30px;line-height:1.22;color:#171512;">Welcome to the house.</div>` +
          `<p style="margin:18px 0 0;font-size:15px;line-height:1.75;color:#55504a;">You are in. Here is 10% off your first order, with our compliments.</p>` +
        `</td></tr>` +
        `<tr><td style="padding:30px 48px 0;text-align:center;">` +
          `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;"><tr><td style="border:1px solid #d8d0c3;background:#efeae1;padding:22px 20px;text-align:center;">` +
            `<div style="font-size:10.5px;letter-spacing:.28em;text-transform:uppercase;color:#857d72;margin:0 0 10px;">Your code</div>` +
            `<div style="font-size:26px;font-weight:700;letter-spacing:.24em;color:#171512;">${WELCOME_CODE}</div>` +
          `</td></tr></table>` +
          `<p style="margin:16px 0 0;font-size:12.5px;line-height:1.7;color:#857d72;">Enter it in the promotion code field at checkout. Valid once, on your first order.</p>` +
        `</td></tr>` +
        `<tr><td style="padding:30px 48px 0;text-align:center;">` +
          `<a href="https://www.cloudskin.com" style="display:inline-block;background:#171512;color:#ffffff;text-decoration:none;font-size:11.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;padding:16px 44px;">Shop the collection</a>` +
        `</td></tr>` +
        `<tr><td style="padding:40px 48px 46px;text-align:center;">` +
          `<div style="height:1px;line-height:1px;font-size:0;background:#e6e0d6;margin:0 0 22px;">&nbsp;</div>` +
          `<div style="font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#857d72;">CLOUDSKIN &middot; Dubai</div>` +
          `<div style="margin:8px 0 0;font-size:11px;line-height:1.6;color:#a59d90;">Luxury activewear. Tennis, padel, studio.</div>` +
        `</td></tr>` +
      `</table>` +
      `<div style="max-width:600px;margin:14px auto 0;text-align:center;font-size:10.5px;line-height:1.6;color:#a59d90;">You received this because you signed up at cloudskin.com.</div>` +
    `</div></div>`
  );
}

// Customer ACCOUNT-welcome email, sent when a new account is created (separate
// from the WELCOME10 newsletter email above; carries no discount code). Same
// editorial CloudSkin look + exact site tokens, email-safe, no em-dashes.
// Greets by first name when we have it.
function accountWelcomeHtml(name: string): string {
  const first = String(name || "").trim().split(/\s+/)[0];
  const greeting = first ? `Welcome, ${esc(first)}.` : "Welcome to the house.";
  return (
    `<div style="margin:0;padding:0;background:#f7f4ef;">` +
    `<div style="background:#f7f4ef;padding:40px 16px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">` +
      `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e6e0d6;border-collapse:separate;">` +
        `<tr><td style="padding:46px 48px 0;text-align:center;">` +
          `<div style="font-size:15px;letter-spacing:.42em;color:#171512;font-weight:600;text-transform:uppercase;">CLOUDSKIN</div>` +
          `<div style="height:1px;line-height:1px;font-size:0;background:#e6e0d6;margin:28px 0 0;">&nbsp;</div>` +
        `</td></tr>` +
        `<tr><td style="padding:34px 48px 0;text-align:center;">` +
          `<div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:30px;line-height:1.22;color:#171512;">${greeting}</div>` +
          `<p style="margin:18px 0 0;font-size:15px;line-height:1.75;color:#55504a;">Your CLOUDSKIN account is ready. Thank you for joining the house. You can now track your orders, save your details, and check out faster.</p>` +
        `</td></tr>` +
        `<tr><td style="padding:30px 48px 0;text-align:center;">` +
          `<a href="https://www.cloudskin.com" style="display:inline-block;background:#171512;color:#ffffff;text-decoration:none;font-size:11.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;padding:16px 44px;">Shop the collection</a>` +
        `</td></tr>` +
        `<tr><td style="padding:22px 48px 0;text-align:center;">` +
          `<a href="https://www.cloudskin.com/account" style="font-size:12px;letter-spacing:.06em;color:#857d72;text-decoration:underline;">View your account</a>` +
        `</td></tr>` +
        `<tr><td style="padding:40px 48px 46px;text-align:center;">` +
          `<div style="height:1px;line-height:1px;font-size:0;background:#e6e0d6;margin:0 0 22px;">&nbsp;</div>` +
          `<div style="font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#857d72;">CLOUDSKIN &middot; Dubai</div>` +
          `<div style="margin:8px 0 0;font-size:11px;line-height:1.6;color:#a59d90;">Luxury activewear. Tennis, padel, studio.</div>` +
        `</td></tr>` +
      `</table>` +
      `<div style="max-width:600px;margin:14px auto 0;text-align:center;font-size:10.5px;line-height:1.6;color:#a59d90;">You received this because you created an account at cloudskin.com.</div>` +
    `</div></div>`
  );
}

// verify the sign-up is real + recent using the service-role admin client
async function verifyRecentUser(userId: string): Promise<{ email: string; name: string } | null> {
  if (!userId || !SUPABASE_URL || !SERVICE_ROLE) return null;
  try {
    const { data, error } = await serviceClient().auth.admin.getUserById(userId);
    if (error) return null;
    const u = data?.user;
    if (!u || !u.id) return null;
    const created = new Date(u.created_at || 0).getTime();
    if (!created || Date.now() - created > 10 * 60 * 1000) return null; // must be < 10 min old
    const meta = (u.user_metadata || {}) as Record<string, unknown>;
    return { email: u.email || "", name: String(meta.full_name || "") };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* ignore */ }
  try {
    if (body.type === "signup") {
      const info = await verifyRecentUser(String(body.userId || ""));
      if (!info) return json({ error: "not a recent sign-up" }, 400);
      // owner alert (to info@cloudskin.com, reply-to the new customer)
      await sendEmail(
        `New CLOUDSKIN account: ${esc(info.email)}`,
        `<h2 style="font-family:Arial,sans-serif">New account created</h2>` +
        `<p><strong>Name:</strong> ${esc(info.name) || "-"}</p>` +
        `<p><strong>Email:</strong> ${esc(info.email)}</p>` +
        `<p style="color:#888;font-family:Arial,sans-serif">Signed up on cloudskin.com</p>`,
        info.email,
      );
      // customer welcome email (best-effort: an email hiccup must never dead-end sign-up)
      if (info.email) {
        try {
          await sendEmail("Welcome to CLOUDSKIN", accountWelcomeHtml(info.name), undefined, info.email);
        } catch (_e) { /* best-effort */ }
      }
      return json({ ok: true });
    }
    if (body.type === "contact") {
      if (body.company) return json({ ok: true }); // honeypot: silently accept bots
      const name = esc(body.name);
      const email = String(body.email || "").trim();
      const message = esc(body.message);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) return json({ error: "invalid input" }, 400);
      await sendEmail(
        `New message from ${name || esc(email)}: CLOUDSKIN`,
        `<h2 style="font-family:Arial,sans-serif">New contact message</h2>` +
        `<p><strong>Name:</strong> ${name || "-"}</p>` +
        `<p><strong>Email:</strong> ${esc(email)}</p>` +
        `<p><strong>Message:</strong></p><p>${message.replace(/\n/g, "<br>")}</p>`,
        email,
      );
      return json({ ok: true });
    }
    if (body.type === "welcome") {
      if (body.company) return json({ ok: true }); // honeypot: silently accept bots
      const email = String(body.email || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid input" }, 400);
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
      if (!(await rateOk(`welcome:${ip}`, 5, 600))) return json({ error: "too many requests" }, 429);
      await sendEmail(
        "Your CLOUDSKIN welcome code: 10% off your first order",
        welcomeHtml(),
        undefined,
        email,
      );
      return json({ ok: true });
    }
    return json({ error: "unknown type" }, 400);
  } catch (e) {
    return json({ error: String((e && (e as Error).message) || e) }, 500);
  }
});
