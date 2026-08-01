-- Web Action commerce starter — initial schema
-- Tables: profiles, products, inventory, orders, order_items
--
-- Security model: catalog + inventory are PUBLIC-READ; orders/order_items are
-- OWNER-READ; every write goes through the service-role key (checkout, webhook,
-- admin) which bypasses RLS. RLS is ON for every table so the anon/auth keys can
-- only do what the policies below allow. Apply with: `supabase db push` (or paste
-- into the SQL editor). Then run `npm run seed` to load the sample catalog.

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- New auth users get a profile row automatically (is_admin stays false; grant
-- admin explicitly with scripts/create-owner.mjs or in the SQL editor).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- products ----------
create table if not exists public.products (
  slug text primary key,
  name text not null,
  brand text,
  price numeric not null default 0,
  compare_at_price numeric,
  category text,
  categories text[] not null default '{}',
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  description text default '',
  materials text default '',
  badge text,
  rating numeric,
  reviews integer not null default 0,
  in_stock boolean not null default true,
  release_date date,
  featured boolean not null default false,
  trending boolean not null default false,
  images text[] not null default '{}',
  plate_color text,
  sort_order integer not null default 0,
  shopify_product_id text,
  shopify_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;

create policy "products: public read"
  on public.products for select
  using (true);

create index if not exists products_sort_idx on public.products (sort_order);
create index if not exists products_category_idx on public.products (category);

-- ---------- inventory ----------
create table if not exists public.inventory (
  product_slug text not null references public.products (slug) on delete cascade,
  size text not null,
  quantity integer not null default 0,
  primary key (product_slug, size)
);
alter table public.inventory enable row level security;

create policy "inventory: public read"
  on public.inventory for select
  using (true);

-- ---------- orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  status text not null default 'pending'
    check (status in ('pending','paid','fulfilled','cancelled','refunded')),
  subtotal_cents integer not null default 0,
  total_cents integer not null default 0,
  currency text not null default 'eur',
  stripe_session_id text,
  stripe_payment_intent text,
  shipping jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;

-- Owners can read their own orders. Guest orders (user_id null) are readable
-- only via the service role (the success page fetches them server-side).
create policy "orders: read own"
  on public.orders for select
  using (auth.uid() = user_id);

create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_session_idx on public.orders (stripe_session_id);

-- ---------- order_items ----------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_slug text,
  name text,
  brand text,
  size text,
  image text,
  unit_price_cents integer not null default 0,
  quantity integer not null default 1
);
alter table public.order_items enable row level security;

create policy "order_items: read own"
  on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.user_id = auth.uid()
  ));

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------- inventory decrement RPC ----------
-- Called by the Stripe webhook (service role) after payment to reduce stock
-- atomically. Never lets quantity go negative. Execute is revoked from the
-- public/anon/authenticated roles; only the service role (which bypasses these
-- grants) calls it.
create or replace function public.decrement_inventory(p_slug text, p_size text, p_qty int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.inventory
     set quantity = greatest(quantity - p_qty, 0)
   where product_slug = p_slug and size = p_size;
$$;

revoke all on function public.decrement_inventory(text, text, int) from public, anon, authenticated;
