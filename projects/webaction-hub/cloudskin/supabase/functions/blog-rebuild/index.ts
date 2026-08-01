import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ============================================================================
// CLOUDSKIN, blog-rebuild  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// PUBLIC endpoint (deploy with verify_jwt = false): WordPress (a writer hitting
// Publish, via the cloudskin-rebuild mu-plugin) calls this, NOT a signed-in
// Supabase user, so auth is a SHARED SECRET, not a JWT.
//
// Why this exists (the headless-blog auto-publish bridge):
//   writer clicks Publish in WordPress
//     -> the mu-plugin POSTs here with header  x-cloudskin-secret: <secret>
//     -> we fire a GitHub repository_dispatch (event "blog-publish") using a
//        GitHub token that lives ONLY in Supabase secrets (never in WordPress)
//     -> .github/workflows/blog-rebuild.yml regenerates /blog from live WP,
//        translates (cache-aware, EN + Arabic), and deploys to Vercel.
//
// The GitHub token is deliberately held HERE, not in WordPress: WordPress is
// client-managed and less trusted, so it only ever holds a rotatable shared
// secret. This function is the only thing that can talk to GitHub.
//
// Secrets (set as Supabase Edge Function env vars in the dashboard):
//   BLOG_REBUILD_SECRET    shared secret; must equal the mu-plugin's.
//                          UNSET  => fail closed, reject every request (503).
//   GITHUB_DISPATCH_TOKEN  a GitHub token allowed to POST /repos/:o/:r/dispatches
//                          (fine-grained PAT with Contents: read/write on the repo,
//                          or a classic token with `repo` scope). UNSET => 503.
//   GH_REPO                "owner/repo". Default "webactionhellas-dev/cloudskin-v67".
//   BLOG_DISPATCH_EVENT    repository_dispatch event_type. Default "blog-publish".
//
// Fail-closed everywhere: no secret, wrong secret, or no GitHub token => no
// dispatch. It moves no money and touches no store data; the worst case of a
// bad call is a no-op.
// ============================================================================

const SHARED_SECRET = Deno.env.get("BLOG_REBUILD_SECRET") || "";
const GH_TOKEN = Deno.env.get("GITHUB_DISPATCH_TOKEN") || "";
const GH_REPO = (Deno.env.get("GH_REPO") || "webactionhellas-dev/cloudskin-v67").trim();
const EVENT_TYPE = (Deno.env.get("BLOG_DISPATCH_EVENT") || "blog-publish").trim();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Constant-time string comparison (avoids a timing side-channel on the secret).
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

// Only pass a few safe scalar fields through to the workflow (logs / traceability).
// Never echo arbitrary WordPress payload into the GitHub dispatch.
function sanitizePayload(p: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!p || typeof p !== "object") return out;
  const src = p as Record<string, unknown>;
  for (const k of ["post_id", "slug", "status", "action"]) {
    const v = src[k];
    if (typeof v === "string" || typeof v === "number") out[k] = String(v).slice(0, 120);
  }
  return out;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "GET") {
    // Lightweight health probe: says whether the function is wired, WITHOUT leaking secrets.
    return json({
      ok: true,
      fn: "blog-rebuild",
      configured: Boolean(SHARED_SECRET) && Boolean(GH_TOKEN),
      repo: GH_REPO,
      event: EVENT_TYPE,
    });
  }
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Inert until Mike sets the shared secret: reject every trigger.
  if (!SHARED_SECRET) return json({ error: "not configured" }, 503);

  const presented =
    req.headers.get("x-cloudskin-secret") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") ||
    "";
  if (!safeEqual(presented, SHARED_SECRET)) return json({ error: "unauthorized" }, 401);

  if (!GH_TOKEN) return json({ error: "dispatch token missing" }, 503);

  let payload: unknown = {};
  try { payload = await req.json(); } catch { /* body is optional */ }

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${GH_REPO}/dispatches`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${GH_TOKEN}`,
        "accept": "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
        "user-agent": "cloudskin-blog-rebuild",
      },
      body: JSON.stringify({
        event_type: EVENT_TYPE,
        client_payload: { source: "wordpress", ...sanitizePayload(payload) },
      }),
    });
  } catch (e) {
    console.error("github dispatch fetch threw:", (e as Error).message);
    return json({ error: "dispatch error" }, 502);
  }

  // GitHub returns 204 No Content on a successful repository_dispatch.
  if (res.status === 204) return json({ ok: true, dispatched: EVENT_TYPE });

  const text = await res.text().catch(() => "");
  console.error("github dispatch failed", res.status, text.slice(0, 300));
  return json({ error: "dispatch failed", status: res.status }, 502);
});
