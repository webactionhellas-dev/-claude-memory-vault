-- ============================================================================
-- VELLUM CORE  -  0001_vellum_core.sql
-- ----------------------------------------------------------------------------
-- Generic backend for Vellum, the on-canvas live-site editor. One flat
-- key -> value content table, public-read only, with ALL writes funneled
-- through SECURITY DEFINER RPCs gated by a bcrypt-checked owner password
-- plus a per-IP throttle. This is the production-proven house pattern
-- (security-audited PASS 2026-07-23), renamed and made client-agnostic.
--
-- APPLY on a fresh Supabase project:
--   Dashboard -> SQL Editor -> paste this whole file -> Run
--   (or: supabase db push / the MCP apply_migration tool)
-- The file is idempotent: safe to re-run.
--
-- AFTER APPLYING: seed the owner password (see the commented seed line in
-- section 3). Nothing can authenticate until that row exists; every RPC
-- fails closed (returns false / raises unauthorized) while it is missing.
--
-- SECURITY MODEL (the invariants an adopting site must keep):
--   * site_content     : RLS on, ONE policy = public SELECT. Zero write
--                        policies, ever. anon/authenticated cannot write.
--   * vellum_secret    : RLS on, ZERO policies, all privileges revoked from
--                        anon/authenticated. Only the SECURITY DEFINER
--                        functions (owner: postgres) can read it.
--   * vellum_throttle  : same lockdown as vellum_secret.
--   * vellum_verify    : the single auth gate (bcrypt cost 12 + throttle).
--                        EXECUTE revoked from public/anon/authenticated;
--                        only the other definer functions call it.
--   * vellum_auth/save/delete : the only client-callable surface. Each one
--                        opens with the vellum_verify check.
--   * Throttle is FAIL-SAFE: any throttle-infrastructure error falls back
--                        to the plain bcrypt check. It can never brick the
--                        owner's login (deny-of-service on yourself is a
--                        worse failure than losing the rate limit).
-- ============================================================================


-- === 0 : pgcrypto (bcrypt) ===================================================
-- Supabase installs extensions into the `extensions` schema.
create extension if not exists pgcrypto with schema extensions;


-- === 1 : site_content (the editable surface; public-read, definer-write) =====
create table if not exists public.site_content (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "site_content: public read" on public.site_content;
create policy "site_content: public read"
  on public.site_content for select
  using (true);

-- Belt and suspenders on top of RLS: the client roles hold no write privilege
-- at the GRANT layer either.
revoke insert, update, delete, truncate on public.site_content from anon, authenticated;
grant  select on public.site_content to anon, authenticated;


-- === 2 : vellum_throttle (per-IP brute-force lockout; definer-only) ==========
create table if not exists public.vellum_throttle (
  ip           text primary key,
  fail_count   integer not null default 0,
  first_fail   timestamptz,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);
alter table public.vellum_throttle enable row level security;
revoke all on public.vellum_throttle from anon, authenticated;

-- Optional housekeeping: stale rows are harmless (success deletes the row,
-- failures upsert it), but if pg_cron is enabled you can purge periodically:
--   select cron.schedule('vellum-throttle-gc', '0 4 * * *',
--     'delete from public.vellum_throttle where updated_at < now() - interval ''2 days''');


-- === 3 : vellum_secret (the owner password hash; definer-only) ===============
-- Single-row table by design (id is checked to 1). When this later becomes
-- multi-tenant, drop the check and key by tenant instead (see SAAS-READY.md).
create table if not exists public.vellum_secret (
  id         integer primary key check (id = 1),
  pass_hash  text not null,
  updated_at timestamptz not null default now()
);
alter table public.vellum_secret enable row level security;
revoke all on public.vellum_secret from anon, authenticated;

-- SEED THE OWNER PASSWORD (run once per site, with a strong secret; this is
-- the ONLY intended placeholder in this file). Keep the plaintext OUT of any
-- repo; run it directly in the SQL editor and clear the editor history:
--
--   insert into public.vellum_secret (id, pass_hash)
--   values (1, extensions.crypt('CHANGE-THIS-PASSWORD', extensions.gen_salt('bf', 12)))
--   on conflict (id) do update
--     set pass_hash = excluded.pass_hash, updated_at = now();
--
-- Rotating the password later = re-run the same statement with the new secret.
-- Cost 12 is the house floor. Until this row exists, all auth fails closed.


-- === 4 : vellum_verify (shared throttled bcrypt gate; internal only) =========
create or replace function public.vellum_verify(p_password text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_ip        text := 'unknown';
  v_ok        boolean := false;
  v_locked    boolean := false;
  v_headers   json;
  c_threshold constant integer  := 10;                 -- wrong tries allowed per window
  c_window    constant interval := interval '15 minutes';
  c_lockout   constant interval := interval '15 minutes';
begin
  -- Best-effort lock pre-check; ANY error here => skip the throttle and fall
  -- through to bcrypt (fail-safe, never deny-all).
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
    if v_headers is not null then
      v_ip := btrim(split_part(
                coalesce(v_headers ->> 'x-forwarded-for',
                         v_headers ->> 'x-real-ip', 'unknown'), ',', 1));
      if v_ip is null or v_ip = '' then v_ip := 'unknown'; end if;
    end if;
    select (locked_until is not null and locked_until > now())
      into v_locked from public.vellum_throttle where ip = v_ip;
    v_locked := coalesce(v_locked, false);
  exception when others then
    v_locked := false; v_ip := 'unknown';
  end;

  if v_locked then
    return false;                                       -- fast-deny, no bcrypt burn
  end if;

  -- Authoritative decision (always runs when not locked). No secret row yet
  -- => v_ok stays null => coalesced to false (fail-closed).
  select (pass_hash = extensions.crypt(p_password, pass_hash))
    into v_ok from public.vellum_secret where id = 1;
  v_ok := coalesce(v_ok, false);

  -- Best-effort bookkeeping; guarded so it can never change v_ok.
  begin
    if v_ok then
      delete from public.vellum_throttle where ip = v_ip;
    else
      insert into public.vellum_throttle as t (ip, fail_count, first_fail, updated_at)
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
    null;                                               -- never affects the auth result
  end;

  return v_ok;
end;
$function$;

revoke all on function public.vellum_verify(text) from public, anon, authenticated;


-- === 5 : vellum_auth (the login gate the /creator page calls) ================
create or replace function public.vellum_auth(p_password text)
returns boolean
language sql
security definer
set search_path to 'public', 'extensions'
as $function$
  select public.vellum_verify(p_password);
$function$;

grant execute on function public.vellum_auth(text) to anon, authenticated, service_role;


-- === 6 : vellum_save (batch key/value upsert; the editor's write path) =======
-- p_items is a flat JSON object {key: value, ...}. Values are stored as text;
-- an empty string means "revert to the built-in default" by convention (the
-- frontend applier fail-opens empty values to the baked-in content).
create or replace function public.vellum_save(p_password text, p_items jsonb)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  c_max_items constant integer := 1000;     -- keys per save call
  c_max_key   constant integer := 512;      -- bytes-ish; keys are short dotted paths
  c_max_value constant integer := 262144;   -- 256 KB per value (URL lists fit easily)
begin
  if not public.vellum_verify(p_password) then
    raise exception 'unauthorized';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'object' then
    raise exception 'p_items must be a JSON object';
  end if;
  if (select count(*) from jsonb_object_keys(p_items)) > c_max_items then
    raise exception 'too many items in one save (max %)', c_max_items;
  end if;
  if exists (
    select 1 from jsonb_each_text(p_items) as t(key, value)
    where length(t.key) = 0
       or length(t.key) > c_max_key
       or length(coalesce(t.value, '')) > c_max_value
  ) then
    raise exception 'item key or value out of bounds';
  end if;

  insert into public.site_content as sc (key, value, updated_at)
  select t.key, coalesce(t.value, ''), now()
  from jsonb_each_text(p_items) as t(key, value)
  on conflict (key) do update
    set value = excluded.value, updated_at = now();
end;
$function$;

grant execute on function public.vellum_save(text, jsonb) to anon, authenticated, service_role;


-- === 7 : vellum_delete (true key removal; "revert to original") ==============
-- Returns the number of rows actually deleted.
create or replace function public.vellum_delete(p_password text, p_keys text[])
returns integer
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  n integer;
begin
  if not public.vellum_verify(p_password) then
    raise exception 'unauthorized';
  end if;
  if p_keys is null or array_length(p_keys, 1) is null then
    return 0;
  end if;
  if array_length(p_keys, 1) > 1000 then
    raise exception 'too many keys in one delete (max 1000)';
  end if;
  delete from public.site_content where key = any(p_keys);
  get diagnostics n = row_count;
  return n;
end;
$function$;

grant execute on function public.vellum_delete(text, text[]) to anon, authenticated, service_role;


-- === 8 : storage bucket for editor image uploads =============================
-- Public-READ bucket; there are deliberately NO storage.objects policies for
-- it, so anon/authenticated cannot write. The vellum-upload edge function
-- (service role) is the only write path. Public read of a public bucket goes
-- through /storage/v1/object/public/... and needs no policy.
-- If you want a different bucket name, change it here AND set the
-- VELLUM_BUCKET secret on the vellum-upload function.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media', 'site-media', true,
  8388608,                                          -- 8 MB, mirrors the edge fn cap
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;


-- ============================================================================
-- VERIFICATION (run after applying + seeding the password; expected results)
-- ============================================================================
-- 1) auth round-trip:
--    select public.vellum_auth('<your password>');    -- expect: true
--    select public.vellum_auth('wrong');               -- expect: false
--
-- 2) save + read + delete round-trip on a throwaway key:
--    select public.vellum_save('<your password>', '{"__vellum_test":"1"}'::jsonb);
--    select value from public.site_content where key = '__vellum_test';   -- expect: 1
--    select public.vellum_delete('<your password>', array['__vellum_test']); -- expect: 1
--
-- 3) wrong password cannot write:
--    select public.vellum_save('wrong', '{"x":"y"}'::jsonb);  -- expect: ERROR unauthorized
--
-- 4) anon role cannot write directly (run with the anon key via PostgREST, or):
--    set local role anon;
--    insert into public.site_content (key, value) values ('x', 'y');
--    -- expect: permission denied / RLS violation
--    reset role;
--
-- 5) hash is cost 12:
--    select left(pass_hash, 7) from public.vellum_secret where id = 1;  -- expect: $2a$12$
--
-- 6) fail-safe (throttle table gone => still authenticates via plain bcrypt):
--    alter table public.vellum_throttle rename to _tmp_throttle;
--    select public.vellum_auth('<your password>');     -- expect: true (NOT deny-all)
--    alter table public._tmp_throttle rename to vellum_throttle;
--
-- Also run the Supabase security advisors (get_advisors) after applying and
-- confirm site_content shows RLS enabled with only the public-SELECT policy.
-- ============================================================================
