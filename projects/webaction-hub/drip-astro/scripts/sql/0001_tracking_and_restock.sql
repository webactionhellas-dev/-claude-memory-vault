-- PROPOSED MIGRATION (GATED: not applied; Mike applies via Supabase SQL editor
-- or approves apply_migration). Everything in the codebase degrades gracefully
-- until this lands: tracking fields answer with a clear hint, restock reports
-- "needs the pending migration", shipped emails send without a tracking link.

-- 1) Shipment tracking on orders (item 3).
alter table public.orders
  add column if not exists tracking_number text,
  add column if not exists courier text;

-- 2) Inverse of decrement_inventory for refund restocks (item 4). Same shape,
--    same hardening: SECURITY DEFINER with a pinned search_path, single atomic
--    UPDATE. Missing rows are intentionally NOT created: restock only returns
--    stock for sizes the store already tracks.
create or replace function public.increment_inventory(p_slug text, p_size text, p_qty integer)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.inventory
     set quantity = quantity + greatest(0, p_qty), updated_at = now()
   where product_slug = p_slug and size = p_size;
$$;

-- Match the execute-grant hardening applied to the other definer functions
-- (migrations 20260708143404 / 20260708143609): server (service_role) only.
revoke execute on function public.increment_inventory(text, text, integer) from public, anon, authenticated;
