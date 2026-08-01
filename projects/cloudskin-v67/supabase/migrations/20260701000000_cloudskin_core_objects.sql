-- ============================================================================
-- CloudSkin, core backend objects (Echo, retroactive baseline)
-- ============================================================================
-- WHY THIS FILE EXISTS
--   The v67 bundle previously shipped ONLY the Stripe checkout migration
--   (20260726100000_stripe_checkout.sql). The edge functions and the site also
--   depend on a set of PRE-EXISTING tables + RPCs that were created directly on
--   the live project (ocszztflphqsaoyhlerx) before the bundle was assembled and
--   therefore had NO migration representing them. This file is a faithful,
--   read-only reconstruction of those objects so a FROM-SCRATCH `supabase db push`
--   rebuilds the complete backend.
--
--   It is timestamped BEFORE the Stripe migration because these objects predate
--   it (studio_save writes cloudskin_content; every function reads app_secrets).
--
-- SAFETY
--   * 100% idempotent: CREATE TABLE / INDEX IF NOT EXISTS, CREATE OR REPLACE
--     FUNCTION, DROP POLICY IF EXISTS then CREATE. Re-running changes nothing.
--   * On the ALREADY-LIVE project these objects exist, so applying this file
--     there is a no-op. Per the source-sync task it was NOT applied to prod.
--   * No secret VALUES are stored here. app_secrets and studio_secret are created
--     EMPTY; the owner seeds them at deploy time (see the notes at the bottom).
--
-- SECURITY MODEL (verified against live pg_policies / grants, 2026-07-27)
--   app_secrets           RLS on, NO policy, service-role-only  (secret store)
--   studio_secret         RLS on, NO policy                     (bcrypt pass hash)
--   studio_auth_throttle  RLS on, NO policy, service-role-only  (lockout counters)
--   cloudskin_content     RLS on, PUBLIC read; writes only via SECURITY DEFINER RPCs
--   newsletter_signups    RLS on, anon INSERT (validated), NO read policy
--   customer_orders       RLS on, authenticated reads ONLY rows matching their JWT email
--   studio_verify()       EXECUTE revoked from client roles (definer-internal only)
--   studio_auth/save/delete() EXECUTE allowed to anon+authenticated (site calls them)
-- ============================================================================

-- pgcrypto provides extensions.crypt()/gen_salt() used by studio_verify (bcrypt).
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1) app_secrets  (service-role-only secret store: Stripe/Shopify/Resend keys)
-- ---------------------------------------------------------------------------
create table if not exists public.app_secrets (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz default now()
);
alter table public.app_secrets enable row level security;
comment on table public.app_secrets is
  'Service-role-only secrets (RLS on, no policies). Never client-readable. Read via SUPABASE_SERVICE_ROLE_KEY inside edge functions.';
-- Service-role-only: strip the default anon/authenticated grants (RLS already
-- denies them; this makes the grant table match the locked-down live state).
revoke all on table public.app_secrets from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) cloudskin_content  (editable site content: key/value, public-readable)
-- ---------------------------------------------------------------------------
create table if not exists public.cloudskin_content (
  key         text primary key,
  value       text not null default ''::text,
  updated_at  timestamptz not null default now()
);
alter table public.cloudskin_content enable row level security;
-- Anyone may READ content (the site renders it). Writes are NOT allowed to
-- clients here; they go through studio_save()/studio_delete() (SECURITY DEFINER).
drop policy if exists "cloudskin_content_read" on public.cloudskin_content;
create policy "cloudskin_content_read"
  on public.cloudskin_content for select
  to public
  using (true);

-- ---------------------------------------------------------------------------
-- 3) newsletter_signups  (footer/popup subscribe: anon INSERT, no read)
-- ---------------------------------------------------------------------------
create table if not exists public.newsletter_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text,
  created_at  timestamptz not null default now()
);
create unique index if not exists newsletter_signups_email_key
  on public.newsletter_signups (lower(email));
alter table public.newsletter_signups enable row level security;
-- Anon/authenticated may INSERT a validly-formatted email. There is deliberately
-- NO select policy, so the subscriber list is never client-readable.
drop policy if exists "public can subscribe" on public.newsletter_signups;
create policy "public can subscribe"
  on public.newsletter_signups for insert
  to anon, authenticated
  with check (
    char_length(email) >= 3
    and char_length(email) <= 320
    and email like '%_@_%.__%'
  );

-- ---------------------------------------------------------------------------
-- 4) customer_orders  (Shopify order mirror written by cloudskin-order-webhook)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_orders (
  shopify_order_id    bigint primary key,
  email               text not null,
  order_name          text,
  processed_at        timestamptz,
  currency            text,
  total_price         numeric,
  financial_status    text,
  fulfillment_status  text,
  line_items          jsonb,
  tracking            jsonb,
  updated_at          timestamptz default now()
);
comment on table public.customer_orders is
  'Shopify orders mirrored via cloudskin-order-webhook (service-role writes only). RLS: a customer reads only rows whose email matches their JWT email.';
comment on column public.customer_orders.line_items is 'jsonb array of {title, quantity, variant}';
comment on column public.customer_orders.tracking is 'jsonb {number, url, company} or null';
create index if not exists customer_orders_email_lower_idx
  on public.customer_orders (lower(email));
alter table public.customer_orders enable row level security;
-- A signed-in customer reads ONLY their own orders (JWT email match). Writes are
-- service-role only (the webhook). Match the live grant posture: no anon access,
-- authenticated read-only.
revoke all on table public.customer_orders from anon;
revoke insert, update, delete, truncate, references, trigger on table public.customer_orders from authenticated;
drop policy if exists "customer_orders_select_own" on public.customer_orders;
create policy "customer_orders_select_own"
  on public.customer_orders for select
  to authenticated
  using (lower(email) = lower((auth.jwt() ->> 'email')));

-- ---------------------------------------------------------------------------
-- 5) studio_secret  (single-row bcrypt hash of the Content Studio password)
-- ---------------------------------------------------------------------------
create table if not exists public.studio_secret (
  id         integer primary key default 1,
  pass_hash  text not null
);
alter table public.studio_secret enable row level security;
-- RLS on with NO policy => client roles cannot read the hash. Only the service
-- role (bypasses RLS) and the SECURITY DEFINER studio_* functions can read it.

-- ---------------------------------------------------------------------------
-- 6) studio_auth_throttle  (per-IP failed-attempt lockout for the studio login)
-- ---------------------------------------------------------------------------
create table if not exists public.studio_auth_throttle (
  ip            text primary key,
  fail_count    integer not null default 0,
  first_fail    timestamptz,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);
alter table public.studio_auth_throttle enable row level security;
comment on table public.studio_auth_throttle is
  'Per-IP failed-login counters/lockout for the Content Studio (service-role-only, RLS on / no policy).';
revoke all on table public.studio_auth_throttle from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7) Content Studio RPCs (SECURITY DEFINER; bodies copied verbatim from live)
-- ---------------------------------------------------------------------------
-- studio_verify: the trusted core. Checks the bcrypt hash, enforces a per-IP
-- lockout (10 fails / 15 min => 15 min lock). Definer-internal only; EXECUTE is
-- revoked from client roles below so it can be called ONLY by the wrappers.
CREATE OR REPLACE FUNCTION public.studio_verify(p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_ip        text := 'unknown';
  v_ok        boolean := false;
  v_locked    boolean := false;
  v_headers   json;
  c_threshold constant integer  := 10;
  c_window    constant interval := interval '15 minutes';
  c_lockout   constant interval := interval '15 minutes';
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
    if v_headers is not null then
      v_ip := btrim(split_part(
                coalesce(v_headers ->> 'x-forwarded-for',
                         v_headers ->> 'x-real-ip', 'unknown'), ',', 1));
      if v_ip is null or v_ip = '' then v_ip := 'unknown'; end if;
    end if;
    select (locked_until is not null and locked_until > now())
      into v_locked from public.studio_auth_throttle where ip = v_ip;
    v_locked := coalesce(v_locked, false);
  exception when others then
    v_locked := false; v_ip := 'unknown';
  end;

  if v_locked then
    return false;
  end if;

  select (pass_hash = extensions.crypt(p_password, pass_hash))
    into v_ok from public.studio_secret where id = 1;
  v_ok := coalesce(v_ok, false);

  begin
    if v_ok then
      delete from public.studio_auth_throttle where ip = v_ip;
    else
      insert into public.studio_auth_throttle as t (ip, fail_count, first_fail, updated_at)
        values (v_ip, 1, now(), now())
      on conflict (ip) do update set
        fail_count   = case when t.first_fail < now() - c_window then 1
                            else t.fail_count + 1 end,
        first_fail   = case when t.first_fail < now() - c_window then now()
                            else t.first_fail end,
        locked_until = case when (case when t.first_fail < now() - c_window then 1
                                       else t.fail_count + 1 end) >= c_threshold
                            then now() + c_lockout else t.locked_until end,
        updated_at   = now();
    end if;
  exception when others then
    null;
  end;

  return v_ok;
end;
$function$;

-- studio_auth: thin bool wrapper the site + studio-upload edge function call.
CREATE OR REPLACE FUNCTION public.studio_auth(p_password text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select public.studio_verify(p_password);
$function$;

-- studio_save: upsert a batch of {key: value} content pairs (auth required).
CREATE OR REPLACE FUNCTION public.studio_save(p_password text, p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare k text; v text;
begin
  if not public.studio_verify(p_password) then raise exception 'unauthorized'; end if;
  for k, v in select key, value from jsonb_each_text(p_items) as t(key, value) loop
    insert into public.cloudskin_content(key, value, updated_at) values (k, v, now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
  end loop;
end; $function$;

-- studio_delete: remove content keys (auth required); returns the row count.
CREATE OR REPLACE FUNCTION public.studio_delete(p_password text, p_keys text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare n integer;
begin
  if not public.studio_verify(p_password) then raise exception 'unauthorized'; end if;
  delete from public.cloudskin_content where key = any(p_keys);
  get diagnostics n = row_count;
  return n;
end; $function$;

-- EXECUTE grants (mirror live): the three wrappers are client-callable; the core
-- studio_verify is NOT (only the definer-internal calls + service role reach it).
revoke all on function public.studio_verify(text) from public, anon, authenticated;
grant execute on function public.studio_verify(text) to service_role;

grant execute on function public.studio_auth(text)                 to anon, authenticated, service_role;
grant execute on function public.studio_save(text, jsonb)          to anon, authenticated, service_role;
grant execute on function public.studio_delete(text, text[])       to anon, authenticated, service_role;

-- ============================================================================
-- POST-DEPLOY, one-time owner setup (run manually; NEVER commit real values):
--
--   -- Content Studio password (bcrypt, cost 12):
--   insert into public.studio_secret (id, pass_hash)
--   values (1, extensions.crypt('YOUR_STUDIO_PASSWORD', extensions.gen_salt('bf', 12)))
--   on conflict (id) do update set pass_hash = excluded.pass_hash;
--
--   -- Edge-function secrets live in app_secrets (or Supabase function secrets).
--   -- See supabase/.env.example for the full key list. Example:
--   insert into public.app_secrets (key, value) values
--     ('STRIPE_SECRET_KEY','sk_...'),
--     ('STRIPE_WEBHOOK_SECRET','whsec_...'),
--     ('SHOPIFY_ADMIN_TOKEN','shpat_...'),
--     ('SHOPIFY_WEBHOOK_SECRET','...'),
--     ('RESEND_API_KEY','re_...')
--   on conflict (key) do update set value = excluded.value, updated_at = now();
-- ============================================================================
