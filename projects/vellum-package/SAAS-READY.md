# Vellum: what changes when this becomes multi-tenant SaaS

One page on the upgrade path, so nothing we ship today blocks it. Today's
model is deliberately simple: ONE Supabase project per client site, ONE owner
password, per-write password auth. That IS a form of tenancy (tenant = project)
and it stays the recommended shape for agency-managed sites. The SaaS shapes
below only matter when many self-serve tenants must share infrastructure.

## Tenancy: per-tenant rows vs per-project DB

- Per-project DB (today): strongest isolation, zero noisy-neighbor risk, per
  client cost visibility. Keep for high-touch agency clients.
- Per-tenant rows (SaaS): add `tenant_id` to `site_content` (PK becomes
  `(tenant_id, key)`), make `vellum_secret` per-tenant rows (drop the
  `check (id = 1)` singleton, key by tenant), and key the throttle on
  `(tenant_id, ip)`. The public-SELECT policy becomes tenant-scoped (resolve
  tenant from the request hostname or an explicit param). Every query in the
  RPCs already goes through 3 small functions, so the change is contained.

Nothing today blocks this: the table is flat key/value (a composite PK is a
plain migration), and all access is funneled through `vellum_verify` +
`vellum_save`/`vellum_delete`, single choke points.

## Auth: token-based replaces per-write password

Today the verified password is re-sent per write (tab-scoped sessionStorage,
fine for a single trusted owner). SaaS replaces it with short-lived tokens:

- `vellum_auth` grows into a login that returns a signed, expiring session
  token (or we move to Supabase Auth users + JWT claims outright).
- `vellum_save`/`vellum_delete` accept the token instead of the password;
  `vellum_verify` becomes "verify token" internally. Because auth is isolated
  in `vellum_verify` (SQL) and `verifyPassword()` (edge fn), swapping the
  mechanism touches exactly those two seams and the small client auth layer.
- RPC evolution rule: PostgREST matches functions by name + named args, so we
  can add DEFAULTed params (e.g. `p_tenant text default null`) without
  breaking existing callers. CAUTION: `create or replace` with a DIFFERENT
  argument list creates an OVERLOAD, not a replacement; when changing a
  signature, `drop function` the old one first or PostgREST RPC calls become
  ambiguous. Version big changes as `vellum_save_v2` if old clients must keep
  working during rollout.

## Draft / publish

Today every save is live immediately (right for a single owner editing her
own site). SaaS adds a staging layer, cleanest as a status column:
`site_content(tenant_id, key, status draft|published, value, updated_at)` with
the public policy filtering `status = 'published'`, a `vellum_publish` RPC
copying draft rows over published ones, and the applier unchanged (it only
ever sees published rows). An append-only `content_history` table (written by
trigger on publish) gives undo/rollback and an audit trail; that same table is
worth adding pre-SaaS as a sellable-grade feature.

## Roles

Today: one shared owner password per site. SaaS: real users via Supabase Auth
with roles (owner, editor, viewer) carried in JWT claims; RPCs check
`auth.uid()` membership in a `tenant_members` table instead of a password.
The frontend arming contract (armed session -> editor chrome) survives as-is;
only what arms it changes (login session instead of password).

## Uploads and storage

Per-tenant prefixes in the bucket (`<tenant>/...`), per-tenant quotas enforced
in the edge function, and a media-library table (`tenant_id, path, url, meta`)
so the editor can offer "previously uploaded" pickers. The current path
sanitizer and password-first order stay; the function just resolves tenant
from the token instead of trusting a client field.

## Billing and ops (when it truly becomes a product)

Stripe Billing subscriptions per tenant (Checkout + Customer Portal + webhook
-> `tenant_subscriptions`), usage caps read by the RPCs (keys per tenant,
storage bytes), and per-tenant advisors/monitoring. Standard house Stripe
pattern; nothing in today's schema fights it.

## Design decisions already made FOR this future

1. All writes behind 3 named RPCs and one internal gate: swapping auth or
   adding tenancy touches seams, not call sites.
2. Flat text key/value content: composite keys, status columns, and history
   tables are additive migrations, not remodels.
3. Config-driven frontend (`VELLUM_CFG`): table/RPC/function names are data,
   so a SaaS build can point the same editor at v2 endpoints per tenant.
4. Edge function reads bucket/caps/origin from env: per-environment and
   per-tenant configuration without code changes.
5. The singleton `check (id = 1)` on `vellum_secret` is the ONLY intentional
   single-tenant constraint, documented here so dropping it is a one-line,
   known step.
