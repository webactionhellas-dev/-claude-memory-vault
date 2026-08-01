import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CLIENT_ID = '0d6c3c3740e7918f91cb3eac9a7c1834';
const DEFAULT_SHOP = 'rta3sf-47.myshopify.com';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const shop = url.searchParams.get('shop') || DEFAULT_SHOP;
  if (!code) return new Response('Missing ?code', { status: 400 });
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) return new Response('Bad shop', { status: 400 });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: row } = await sb.from('app_secrets').select('value').eq('key','SHOPIFY_APP_CLIENT_SECRET').maybeSingle();
  const clientSecret = row?.value || '';
  if (!clientSecret) return new Response('No client secret configured', { status: 500 });
  let body = '';
  try {
    const resp = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: clientSecret, code }),
    });
    body = await resp.text();
    if (!resp.ok) return new Response('Exchange failed (' + resp.status + '): ' + body.slice(0,300), { status: 502 });
  } catch (e) { return new Response('Exchange threw: ' + String(e).slice(0,200), { status: 502 }); }
  let token = '';
  try { token = JSON.parse(body).access_token || ''; } catch {}
  if (!token) return new Response('No access_token in exchange response', { status: 502 });
  const { error } = await sb.from('app_secrets').upsert({ key: 'SHOPIFY_ADMIN_TOKEN', value: token }, { onConflict: 'key' });
  if (error) return new Response('Token got but store failed: ' + error.message, { status: 500 });
  return new Response('CloudSkin OK: Shopify Admin token stored (' + token.slice(0,7) + '...). You can close this tab.', { status: 200, headers: { 'Content-Type': 'text/plain' } });
});
