# Deploy notes: Unicorn Tattoo CMS

Backend: Supabase project **unicorn-tattoo** (ref `gezbgdekzxljgpyuoqzs`, region eu-central-1, free tier, $0/month) in the org "webactionhellas-dev's Org". Deploy stays gated on Mike's explicit go.

## Env vars to add on Vercel (project: unicorn-tattoo)

Scope: Production + Preview + Development. Both values are public by design; there is NO service_role key anywhere in this system and none must ever be added to the app.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gezbgdekzxljgpyuoqzs.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon key (in `.env.local` locally; also Supabase Dashboard > Settings > API) |

Already-documented optional vars stay as they were: `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `BOOKING_TO_EMAIL`, `BOOKING_FROM_EMAIL`, `BEHOLD_FEED_ID`.

If the Supabase env vars are missing the site still builds and renders fully from the bundled content (verified); only /admin becomes inert. So a misconfigured deploy can never take the public site down.

## Webhooks / endpoints

None to register. Cache refresh is `POST /api/revalidate` on the site itself, called by the admin panel with the owner's session JWT. It verifies the caller against Supabase Auth plus the `admin_users` table (under RLS) and then revalidates the `cms` tag. Public pages are SSG + ISR (1h safety revalidate) and re-render on demand after each admin save.

## Owner admin

- URL: `/admin` (unlinked, noindex via metadata plus `X-Robots-Tag`, absent from the sitemap).
- Login: `unicorntattoo2001@gmail.com`, password recorded in `.env.local` (`ADMIN_*`). **Mike: change it after handover** (Supabase Dashboard > Authentication > Users > ... > Reset password, or send the owner a reset link).
- Only accounts present in `public.admin_users` can write anything or revalidate. A random signup gets no access even if signups stay enabled.

## Supabase dashboard steps (one-time, cannot be set via API)

1. Authentication > Sign In / Up: disable "Allow new users to sign up" (defence in depth; RLS already blocks strangers).
2. Authentication > Passwords: enable leaked password protection (the one remaining security advisor WARN).

## Data model (project gezbgdekzxljgpyuoqzs)

- `site_content(key, locale, value)`: sparse overrides of the flattened next-intl keys; bundled JSON in `src/messages/` is always the fallback.
- `artists`, `portfolio_items` (per-artist works, cascade delete), `studios`, `featured_work`, `instagram_posts`, `piercing_photos`, `site_settings` (backgrounds, social links, piercing intro image), `admin_users`.
- Storage bucket `site` (public read, 10MB cap, jpeg/png/webp only, admin-only write/list). Admin uploads are resized client-side to max 1600px JPEG.
- RLS on every table; `private.is_admin()` (non-exposed schema) gates all writes. Migration snapshots live in `supabase/migrations/`, seed mirror in `supabase/seed.sql`.

## Operations notes

- Deleting a photo in the admin removes the DB row; the storage object stays (harmless, public bucket of site imagery). Occasional cleanup: Dashboard > Storage > site.
- Free tier: 500MB database, 1GB storage, 5GB egress/month. This site's CMS traffic is a rounding error (pages are static; the DB is hit only on revalidation). Upgrade is not needed unless uploads exceed 1GB.
- If Supabase is ever paused (free tier pauses after 1 week of full inactivity), the public site keeps serving its last rendered pages and the bundled fallback; restore the project from the dashboard to re-enable editing. The hourly ISR keeps working off cached data.
