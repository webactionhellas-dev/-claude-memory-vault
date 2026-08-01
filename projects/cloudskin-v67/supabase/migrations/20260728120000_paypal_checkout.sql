-- ============================================================================
-- CloudSkin, PayPal checkout rail (Echo, 2026-07-28)
-- ============================================================================
-- ADDITIVE ONLY: no existing column is altered or dropped, no existing row is
-- touched. Generalizes the existing Stripe-only payment ledger
-- (public.stripe_orders / public.stripe_order_items) into a shared,
-- provider-agnostic ledger so BOTH rails share ONE audit trail and ONE
-- Shopify-order-creation code path (_shared/fulfillment.ts). The table keeps
-- its historical "stripe_" name (renaming a live table with 20+ real rows for
-- a naming nicety is not worth the risk); `payment_provider` is what makes it
-- provider-agnostic in practice.
--
-- Security model (same as the existing stripe_checkout migration, group D):
--   * paypal_events is service-role-only (RLS on, no policy) — identical
--     posture to the existing stripe_events / stripe_checkout_throttle /
--     app_secrets tables in this project. No new attack surface.
--   * The new stripe_orders columns are covered by the EXISTING "read own"
--     RLS policy (unchanged) — a customer can already only read rows where
--     auth.uid() = user_id; PayPal rows are no more or less exposed than
--     Stripe rows.
-- ============================================================================

alter table public.stripe_orders
  add column if not exists payment_provider text not null default 'stripe'
    check (payment_provider in ('stripe', 'paypal')),
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text;

comment on column public.stripe_orders.payment_provider is
  'Which rail paid this order: stripe (default, backward-compatible) or paypal.';
comment on column public.stripe_orders.paypal_order_id is
  'PayPal Orders v2 order id (set at create-paypal-order time, before approval/capture).';
comment on column public.stripe_orders.paypal_capture_id is
  'PayPal capture id (set once the payment is actually captured).';

-- Partial unique indexes: only meaningful (and only enforced) for PayPal rows,
-- so Stripe rows (where these are always null) are unaffected.
create unique index if not exists stripe_orders_paypal_order_idx
  on public.stripe_orders (paypal_order_id) where paypal_order_id is not null;
create unique index if not exists stripe_orders_paypal_capture_idx
  on public.stripe_orders (paypal_capture_id) where paypal_capture_id is not null;
create index if not exists stripe_orders_provider_idx
  on public.stripe_orders (payment_provider);

-- ---------------------------------------------------------------------------
-- paypal_events (idempotency ledger, keyed on the PayPal webhook event id)
-- ---------------------------------------------------------------------------
-- Mirrors stripe_events exactly (see 20260726100000_stripe_checkout.sql) but
-- kept as its OWN table rather than reusing stripe_events: a PayPal webhook
-- event id (WH-...) and a Stripe event id (evt_...) are different id spaces
-- from different providers, and each rail's idempotency ledger should be
-- independently auditable rather than interleaved in one table.
create table if not exists public.paypal_events (
  id            text primary key,     -- PayPal webhook event id
  type          text,
  order_id      uuid,
  received_at   timestamptz not null default now()
);

alter table public.paypal_events enable row level security;
comment on table public.paypal_events is
  'PayPal webhook idempotency ledger (service-role-only, RLS on / no policy). Keyed on the PayPal webhook event id so retries never double-process.';

-- ============================================================================
-- End of migration. After applying, run get_advisors(security) +
-- get_advisors(performance). Expected: paypal_events shows the same benign
-- "RLS enabled, no policy" INFO lint as stripe_events/app_secrets already do —
-- that is intentional (deny-all to client roles), not a failure.
-- ============================================================================
