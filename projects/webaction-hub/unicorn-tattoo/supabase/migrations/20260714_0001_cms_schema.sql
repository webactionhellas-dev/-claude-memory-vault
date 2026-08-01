-- Unicorn Tattoo CMS schema (applied to project gezbgdekzxljgpyuoqzs as "cms_schema")
-- Security model: anon reads published content only; every write requires the
-- authenticated owner (admin_users membership). No service_role usage anywhere.
-- NOTE: 20260714_0002_harden_policies.sql supersedes the policy section below
-- (is_admin moved to the non-exposed "private" schema, write policies split).

-- ---------------------------------------------------------------- helpers --

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- A user may check only their own membership (used by /api/revalidate).
create policy "admin_users: read own row"
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()));
-- No insert/update/delete policies on purpose: membership is managed from the
-- SQL console / dashboard only.

create or replace function public.is_admin()
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

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------- tables --

-- Flattened next-intl text overrides ("hero.kicker"). Sparse: only keys the
-- owner changed are stored; the bundled JSON stays the fallback.
create table public.site_content (
  key text not null check (char_length(key) between 1 and 200),
  locale text not null check (locale in ('el', 'en')),
  value text not null check (char_length(value) <= 5000),
  updated_at timestamptz not null default now(),
  primary key (key, locale)
);

create table public.artists (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
  name text not null default '',
  styles text[] not null default '{}',
  locations text[] not null default '{}',
  portrait text not null default '',
  bio_el text not null default '',
  bio_en text not null default '',
  instagram text,
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null references public.artists (slug) on delete cascade,
  src text not null,
  ar numeric not null default 1 check (ar > 0 and ar < 10),
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create index portfolio_items_artist_sort_idx
  on public.portfolio_items (artist_slug, sort);

create table public.studios (
  id text primary key check (id in ('glyfada', 'corfu')),
  city text not null,
  city_el text not null,
  street text not null,
  street_el text not null,
  postal_code text not null,
  region text not null,
  note text,
  note_el text,
  phone text not null,
  email text not null,
  lat double precision not null,
  lng double precision not null,
  place_ftid text not null default '',
  place_name text not null default '',
  maps_url text not null default '',
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.featured_work (
  id uuid primary key default gen_random_uuid(),
  style text not null check (style in ('realistic', 'graphic', 'geometric', 'lettering', 'piercing')),
  src text not null,
  alt_en text not null default '',
  alt_el text not null default '',
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  src text not null,
  href text not null default '',
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.piercing_photos (
  id uuid primary key default gen_random_uuid(),
  src text not null,
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key check (char_length(key) between 1 and 100),
  value text not null check (char_length(value) <= 2000),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------ updated_at triggers --

create trigger set_updated_at before update on public.site_content
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.artists
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.portfolio_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.studios
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.featured_work
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.instagram_posts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.piercing_photos
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------- RLS --

alter table public.site_content enable row level security;
alter table public.artists enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.studios enable row level security;
alter table public.featured_work enable row level security;
alter table public.instagram_posts enable row level security;
alter table public.piercing_photos enable row level security;
alter table public.site_settings enable row level security;

-- Text overrides and settings are public site copy: world-readable.
create policy "site_content: public read" on public.site_content
  for select using (true);
create policy "site_settings: public read" on public.site_settings
  for select using (true);

-- Content tables: anon sees published rows only; the admin sees everything.
create policy "artists: read published" on public.artists
  for select using (visible = true or (select public.is_admin()));
create policy "portfolio_items: read published" on public.portfolio_items
  for select using (visible = true or (select public.is_admin()));
create policy "studios: read published" on public.studios
  for select using (visible = true or (select public.is_admin()));
create policy "featured_work: read published" on public.featured_work
  for select using (visible = true or (select public.is_admin()));
create policy "instagram_posts: read published" on public.instagram_posts
  for select using (visible = true or (select public.is_admin()));
create policy "piercing_photos: read published" on public.piercing_photos
  for select using (visible = true or (select public.is_admin()));

-- Writes: owner only, on every table.
create policy "site_content: admin write" on public.site_content
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "artists: admin write" on public.artists
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "portfolio_items: admin write" on public.portfolio_items
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "studios: admin write" on public.studios
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "featured_work: admin write" on public.featured_work
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "instagram_posts: admin write" on public.instagram_posts
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "piercing_photos: admin write" on public.piercing_photos
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "site_settings: admin write" on public.site_settings
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------- storage --

-- Public-read bucket for owner-uploaded site images, capped and typed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site', 'site', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "site bucket: public read" on storage.objects
  for select using (bucket_id = 'site');
create policy "site bucket: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site' and (select public.is_admin()));
create policy "site bucket: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'site' and (select public.is_admin()))
  with check (bucket_id = 'site' and (select public.is_admin()));
create policy "site bucket: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site' and (select public.is_admin()));
