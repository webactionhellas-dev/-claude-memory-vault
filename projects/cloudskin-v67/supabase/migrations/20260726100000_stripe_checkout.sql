-- ============================================================================
-- CloudSkin, custom Stripe checkout backend (Echo, 2026-07-26)  PRE-BUILD
-- ============================================================================
-- This migration is ADDITIVE and NON-COLLIDING. It is NOT applied to the live
-- project by the build step. Apply it at go-live (a dev branch first, then merge)
-- once the Stripe keys arrive. See supabase/README.md for the ordered runbook.
--
-- Why a dedicated stripe_* namespace instead of reusing public.orders:
--   The live project already has public.orders / public.order_items (the drip
--   starter schema) and public.customer_orders (the Shopify order mirror that
--   feeds account.html via the existing cloudskin-order-webhook). To guarantee we
--   never corrupt live data, this flow gets its own tables. Paid orders still
--   reach the customer's order history the normal way: the webhook creates the
--   order in Shopify (Admin API), Shopify fires orders/create, and the EXISTING
--   cloudskin-order-webhook mirrors it into customer_orders. stripe_orders is the
--   payment source of truth + the safety net if Shopify sync is not yet wired.
--
-- Security model (mirrors the house pattern and the security gate, group D):
--   * RLS ON for every table here.
--   * Customers may READ ONLY their own orders (auth.uid() = user_id). Guest
--     orders (user_id null) are service-role-only, never anon-readable.
--   * NO insert/update/delete policies exist: every write goes through the
--     service-role key inside the edge functions (which bypasses RLS). The
--     browser can never write an order or move money.
--   * stripe_events + stripe_checkout_throttle are service-role-only (RLS on, no
--     policy = deny all to anon/authenticated), matching the existing app_secrets
--     convention already in this project.
--   * Idempotency: the webhook is keyed on the Stripe EVENT id (stripe_events),
--     so retries and replays never double-process a payment or double-sync Shopify.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) stripe_orders  (payment source of truth)
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_orders (
  id                        uuid primary key default gen_random_uuid(),
  -- Stripe references
  stripe_session_id         text unique,
  stripe_payment_intent     text,
  stripe_event_id           text,            -- the event that marked this paid (audit)
  -- ownership (nullable: guest checkout is allowed)
  user_id                   uuid references auth.users (id) on delete set null,
  email                     text,
  -- lifecycle
  status                    text not null default 'pending'
                              check (status in ('pending','paid','fulfilled','cancelled','refunded','failed')),
  -- money: BASE is the store settlement currency (authoritative, server-computed).
  -- PRESENTMENT is what the customer was actually charged in (from Stripe on paid;
  -- equals base in adaptive mode until Stripe reports the localized amount).
  base_currency             text not null default 'eur',
  base_subtotal_cents       bigint not null default 0,   -- minor units of base_currency
  base_total_cents          bigint not null default 0,   -- minor units of base_currency (== subtotal for now; shipping/duties already in price)
  presentment_currency      text,                        -- ISO code Stripe charged in (lower-case)
  presentment_total_cents   bigint,                      -- Stripe amount_total (minor units of presentment_currency)
  -- Goal B (DDP): prices are duties-inclusive; this records the intent for the label.
  duties_included           boolean not null default true,
  -- shipping address captured at Stripe Checkout (for the customs label + fulfilment)
  shipping                  jsonb,
  -- Shopify fulfilment sync (graceful: a paid order is NEVER lost if this fails)
  shopify_sync_status       text not null default 'pending'
                              check (shopify_sync_status in ('pending','synced','skipped','failed')),
  shopify_sync_error        text,
  shopify_order_id          bigint,
  -- checkout presentment mode used ('adaptive' | 'manual'), for audit
  presentment_mode          text,
  metadata                  jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.stripe_orders enable row level security;

-- Customers read ONLY their own orders. Guest orders (user_id null) are
-- service-role-only. No write policy: writes are service-role (edge functions).
drop policy if exists "stripe_orders: read own" on public.stripe_orders;
create policy "stripe_orders: read own"
  on public.stripe_orders for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists stripe_orders_user_idx    on public.stripe_orders (user_id);
create index if not exists stripe_orders_email_idx   on public.stripe_orders (lower(email));
create index if not exists stripe_orders_status_idx  on public.stripe_orders (status);
create index if not exists stripe_orders_sync_idx    on public.stripe_orders (shopify_sync_status);
create index if not exists stripe_orders_session_idx on public.stripe_orders (stripe_session_id);

-- ---------------------------------------------------------------------------
-- 2) stripe_order_items  (line snapshot, server-priced)
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_order_items (
  id                  bigint generated always as identity primary key,
  order_id            uuid not null references public.stripe_orders (id) on delete cascade,
  shopify_variant_id  text,                 -- Shopify variant GID (the checkout handoff key)
  product_handle      text,
  title               text,                 -- product title (from Shopify, never client-sent)
  variant_title       text,                 -- e.g. "White / M"
  size                text,
  unit_price_cents    bigint not null default 0,  -- minor units of `currency`
  currency            text not null default 'eur',
  quantity            integer not null default 1,
  -- Goal B (DDP) hook: per-line country of manufacture for the customs label.
  -- Pending from the owner (config map or Shopify metafield). Nullable by design.
  country_of_origin   text
);

alter table public.stripe_order_items enable row level security;

-- Read own via the parent order. No write policy (service-role writes only).
drop policy if exists "stripe_order_items: read own" on public.stripe_order_items;
create policy "stripe_order_items: read own"
  on public.stripe_order_items for select
  to authenticated
  using (exists (
    select 1 from public.stripe_orders o
    where o.id = stripe_order_items.order_id
      and o.user_id = auth.uid()
  ));

create index if not exists stripe_order_items_order_idx on public.stripe_order_items (order_id);

-- ---------------------------------------------------------------------------
-- 3) stripe_events  (idempotency ledger, keyed on the Stripe event id)
-- ---------------------------------------------------------------------------
-- The webhook INSERTs the event id before processing. A unique-violation means
-- the event was already handled (Stripe retried/replayed) so we skip. This is
-- the single idempotency guarantee for the money + Shopify-sync side effects.
-- Service-role-only: RLS on, no policy (deny all to anon/authenticated).
create table if not exists public.stripe_events (
  id            text primary key,       -- Stripe event id (evt_...)
  type          text,
  order_id      uuid,
  received_at   timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
comment on table public.stripe_events is
  'Stripe webhook idempotency ledger (service-role-only, RLS on / no policy). Keyed on the Stripe event id so retries never double-process.';

-- ---------------------------------------------------------------------------
-- 4) stripe_checkout_throttle + rate-limit RPC  (public endpoint protection)
-- ---------------------------------------------------------------------------
-- Best-effort durable IP rate limit for create-checkout-session, mirroring the
-- existing studio_auth_throttle pattern. Service-role-only table; the RPC is
-- SECURITY DEFINER and its EXECUTE is revoked from anon/authenticated so only the
-- edge function (service role) can call it.
create table if not exists public.stripe_checkout_throttle (
  ip            text primary key,
  window_start  timestamptz not null default now(),
  hits          integer not null default 0,
  updated_at    timestamptz not null default now()
);
alter table public.stripe_checkout_throttle enable row level security;
comment on table public.stripe_checkout_throttle is
  'Per-IP rate-limit counters for create-checkout-session (service-role-only, RLS on / no policy).';

-- Returns TRUE when the caller is ALLOWED (under the limit), FALSE when blocked.
-- Fixed-window counter, implemented as a single ATOMIC upsert so concurrent
-- requests for the same IP cannot race (no select-then-insert gap).
create or replace function public.stripe_checkout_rate_hit(
  p_ip text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  if p_ip is null or p_ip = '' then
    return true;  -- cannot identify the caller; do not hard-block checkout
  end if;

  insert into public.stripe_checkout_throttle (ip, window_start, hits, updated_at)
  values (p_ip, now(), 1, now())
  on conflict (ip) do update
    set window_start = case
          when now() - public.stripe_checkout_throttle.window_start > make_interval(secs => p_window_seconds)
          then now() else public.stripe_checkout_throttle.window_start end,
        hits = case
          when now() - public.stripe_checkout_throttle.window_start > make_interval(secs => p_window_seconds)
          then 1 else public.stripe_checkout_throttle.hits + 1 end,
        updated_at = now()
  returning hits into v_hits;

  return v_hits <= p_max;
end;
$$;

revoke all on function public.stripe_checkout_rate_hit(text, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) updated_at touch trigger for stripe_orders
-- ---------------------------------------------------------------------------
create or replace function public.stripe_orders_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists stripe_orders_touch on public.stripe_orders;
create trigger stripe_orders_touch
  before update on public.stripe_orders
  for each row execute function public.stripe_orders_touch_updated_at();

-- ============================================================================
-- End of migration. After applying (on a branch), run:
--   get_advisors(security) + get_advisors(performance)  and clear anything new.
-- Expected: the two service-role-only tables (stripe_events,
-- stripe_checkout_throttle) will show the INFO "RLS enabled, no policy" lint.
-- That is INTENTIONAL and correct (deny-all to client roles), identical to the
-- existing public.app_secrets table. It is not a failure.
-- ============================================================================
