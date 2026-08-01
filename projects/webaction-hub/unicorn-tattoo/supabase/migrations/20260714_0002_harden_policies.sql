-- Advisor-driven hardening (applied to project gezbgdekzxljgpyuoqzs as "harden_policies"):
-- 1. is_admin() moves to the non-exposed "private" schema (not callable via
--    /rest/v1/rpc, silences SECURITY DEFINER exposure lints).
-- 2. Write policies become INSERT/UPDATE/DELETE-specific so the authenticated
--    role never has two permissive SELECT policies on one table.
-- 3. The public bucket loses its broad listing policy; objects stay reachable
--    through /object/public/ URLs, only the admin can list.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- ---- replace table policies ------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['artists','portfolio_items','studios','featured_work','instagram_posts','piercing_photos'] loop
    execute format('drop policy if exists "%s: read published" on public.%I', t, t);
    execute format('drop policy if exists "%s: admin write" on public.%I', t, t);
    execute format(
      'create policy "%s: read published" on public.%I for select using (visible = true or (select private.is_admin()))', t, t);
    execute format(
      'create policy "%s: admin insert" on public.%I for insert to authenticated with check ((select private.is_admin()))', t, t);
    execute format(
      'create policy "%s: admin update" on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t, t);
    execute format(
      'create policy "%s: admin delete" on public.%I for delete to authenticated using ((select private.is_admin()))', t, t);
  end loop;

  foreach t in array array['site_content','site_settings'] loop
    execute format('drop policy if exists "%s: admin write" on public.%I', t, t);
    execute format(
      'create policy "%s: admin insert" on public.%I for insert to authenticated with check ((select private.is_admin()))', t, t);
    execute format(
      'create policy "%s: admin update" on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t, t);
    execute format(
      'create policy "%s: admin delete" on public.%I for delete to authenticated using ((select private.is_admin()))', t, t);
  end loop;
end $$;

-- ---- storage policies -------------------------------------------------------

drop policy if exists "site bucket: public read" on storage.objects;
drop policy if exists "site bucket: admin insert" on storage.objects;
drop policy if exists "site bucket: admin update" on storage.objects;
drop policy if exists "site bucket: admin delete" on storage.objects;

-- Listing restricted to the admin; public object access flows through the
-- bucket's public flag, which does not require a SELECT policy.
create policy "site bucket: admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'site' and (select private.is_admin()));
create policy "site bucket: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site' and (select private.is_admin()));
create policy "site bucket: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'site' and (select private.is_admin()))
  with check (bucket_id = 'site' and (select private.is_admin()));
create policy "site bucket: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site' and (select private.is_admin()));

-- ---- retire the exposed helper ----------------------------------------------

drop function if exists public.is_admin();
