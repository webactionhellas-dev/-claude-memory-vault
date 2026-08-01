// ============================================================================
// CloudSkin, studio-publish  (Supabase Edge Function, Deno)
// ----------------------------------------------------------------------------
// PURPOSE (Deliverable 2 - keep the baked snapshot fresh automatically):
//   The deploy-time snapshot in js/content-snapshot.js only re-bakes on a deploy.
//   A photo the owner replaces in Studio AFTER the last deploy therefore stays
//   stale in that first-paint snapshot until the site is rebuilt. This function
//   lets the owner trigger a production rebuild from inside Studio, without
//   anyone needing a deploy secret in the browser.
//
// 2026-07-30: originally designed around a Vercel Deploy Hook, but this Vercel
// project is DELIBERATELY not connected to a Git repository (so a plain git
// push never also triggers an uncontrolled auto-deploy racing the token-based
// scripts/deploy.mjs) - Deploy Hooks require that connection, so they are not
// available here. Rewired onto the SAME repository_dispatch -> GitHub Actions
// pattern already proven live today for blog-rebuild and
// shopify-product-webhook: reuses GITHUB_DISPATCH_TOKEN, no new secret needed.
//
// SECURITY:
//   * PUBLIC endpoint (deploy with --no-verify-jwt), authenticated by the SAME
//     studio password as studio_auth / studio_save - re-checked server-side via
//     the studio_auth SECURITY DEFINER RPC using the service role.
//   * GITHUB_DISPATCH_TOKEN is a Supabase Function secret (edge function env),
//     never client-exposed - same token blog-rebuild and shopify-product-webhook
//     already use for repository_dispatch.
//   * A soft per-isolate cooldown swallows accidental double-clicks; the real
//     debounce/cooldown lives in the Studio button (90s) - this can never storm.
//   * The GitHub Actions workflow itself also collapses bursts (concurrency
//     group, cancel-in-progress), so even several fast clicks = one deploy.
//
// Request  (POST JSON): { password }
// Response: 200 { ok: true }  |  400/401/403/429/500/503 { error }
// ============================================================================
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
import { serviceClient, serviceReady } from '../_shared/env.ts';

const GH_TOKEN = Deno.env.get('GITHUB_DISPATCH_TOKEN') || '';
const GH_REPO = (Deno.env.get('GH_REPO') || 'webactionhellas-dev/cloudskin-v67').trim();
const EVENT_TYPE = 'studio-publish';

// Best-effort, per-isolate double-click guard (real cooldown is client-side).
const MIN_INTERVAL_MS = 30 * 1000;
let lastFireAt = 0;

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req);
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!isAllowedOrigin(req)) return json({ error: 'forbidden origin' }, 403);
  if (!serviceReady()) return json({ error: 'server not configured' }, 503);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: 'invalid JSON body' }, 400); }

  // 1) authenticate FIRST - nothing happens on a bad password.
  const password = String(body.password || '');
  if (!password) return json({ error: 'unauthorized' }, 401);
  try {
    const { data: ok, error } = await serviceClient().rpc('studio_auth', { p_password: password });
    if (error || ok !== true) return json({ error: 'unauthorized' }, 401);
  } catch {
    return json({ error: 'unauthorized' }, 401);
  }

  // 2) soft double-fire guard
  const now = Date.now();
  if (now - lastFireAt < MIN_INTERVAL_MS) {
    return json({ error: 'a publish was just started; please wait a moment' }, 429);
  }

  if (!GH_TOKEN) return json({ error: 'dispatch token missing' }, 503);

  // 3) fire the GitHub repository_dispatch that drives .github/workflows/studio-publish.yml
  try {
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/dispatches`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${GH_TOKEN}`,
        'accept': 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'content-type': 'application/json',
        'user-agent': 'cloudskin-studio-publish',
      },
      body: JSON.stringify({ event_type: EVENT_TYPE, client_payload: { source: 'studio' } }),
    });
    if (res.status !== 204) {
      const txt = await res.text().catch(() => '');
      return json({ error: `dispatch failed: ${res.status} ${txt.slice(0, 200)}` }, 502);
    }
    lastFireAt = now;
    return json({ ok: true });
  } catch (e) {
    return json({ error: `dispatch error: ${(e as Error).message}` }, 502);
  }
});
