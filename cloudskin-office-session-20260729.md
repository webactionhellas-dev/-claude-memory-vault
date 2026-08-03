---
name: cloudskin-office-session-20260729
description: "CloudSkin session 2026-07-29 — NEWEST STATE, start here: blog auto-publish pipeline ACTIVATED + live (all 4 GitHub secrets set, verified green end-to-end); blog empty-state + header-collision + numbered-pagination fixes shipped; WordPress now headless-LIVE (not sample mode); draft-invoice email confirmed applied; SEO team getting WP ADMIN account (waiting on their email)"
metadata:
  node_type: memory
  type: project
  originSessionId: f69617f8-7852-4c5f-8be1-4ee37e93c84c
  modified: 2026-07-29T14:32:33.788Z
---

Continuation of [[cloudskin-office-session-20260728]] (read that for prior context: checkout-404
hardening, product-photo flash 2-layer fix, 3 UI bugs, DNS-hijack outage). Source repo
`C:\Users\nospa\cloudskin-v67`, git remote `webactionhellas-dev/cloudskin-v67` branch `main`, fully
synced office↔home (0 ahead/0 behind at session end, HEAD `f5c7c8e`). Deploy = `node scripts/deploy.mjs`
from that folder (re-bakes `js/content-snapshot.js` from live Supabase, deploys Vercel project `cloudskin`
team `webactionhellascom`, self-verifies served snapshot == live → no-flash).

## DONE + VERIFIED + LIVE 2026-07-29
- **Blog auto-publish pipeline ACTIVATED, verified green end-to-end.** Chain: WordPress publish/trash →
  `cloudskin-rebuild` mu-plugin → Supabase edge fn `blog-rebuild` → GitHub `repository_dispatch` (event
  `blog-publish`) → GitHub Action `blog-rebuild` → `gen-blog.mjs` (+`translate-posts.mjs`, cache-aware,
  Anthropic) → `deploy.mjs` → Vercel. **What made it work:** none of the 4 required GitHub Actions repo
  secrets had ever actually saved (same silent-non-save failure as the GitHub PAT earlier) — the deploy
  step failed "No existing credentials found." Re-created all 4 via the direct
  `github.com/webactionhellas-dev/cloudskin-v67/settings/secrets/actions/new` form (reliable; the token
  form kept silently not-saving): `VERCEL_TOKEN` (Vercel token `cloudskin-ci`, scope `webaction`, No
  Expiration — Mike created+copied it himself, house rule = I never handle the secret value),
  `VERCEL_ORG_ID`=`team_fAnVpAdOPwPZAR4kW0o2BwID`, `VERCEL_PROJECT_ID`=`prj_6d0gmXALxXTKZFj7AAVoBZfns12W`,
  `ANTHROPIC_API_KEY` (Mike's own key, free "Evaluation access" plan — creating+saving costs nothing;
  translations only bill once he adds credits; with no key the build cleanly falls back to English-only,
  never fails). WordPress side was already wired: mu-plugin `cloudskin-rebuild.php` +
  `00-cloudskin-secret.php` (holds `CLOUDSKIN_REBUILD_SECRET`=`ac742d15ad9d46443ac23ab9c00a44533551ba05999ac0f3`,
  uploaded via EasyWP SFTP, `00-` prefix loads it before the plugin — purely additive, never touched
  `wp-config.php`). Ran `blog-rebuild` manually twice + a real dispatch: all SUCCESS. Test post + WP
  default "Hello world!" then trashed (trash also triggers a rebuild).
- **WordPress is now headless-LIVE, NOT sample mode.** `js/blog-config.js` `url` =
  `https://cloudskin-journal-13d6d4e.ingress-haven.ewp.live/wp-json/wp/v2`, `perPage: 9`. (Supersedes the
  20260728 note that said `url:""`.) WP admin: `wp-admin` on that host, owner login `cloudenterprise26`.
  Installed plugins: Akismet, Brizy + Brizy Pro (page builder, unused for headless), Hello Dolly — **NO
  SEO plugin yet.** WP core shows a critical-vuln notice (`wp2shell`, update to 7.0.2 available) — flagged
  to Mike, NOT applied.
- **Blog empty-state fix (2 commits).** A reachable-but-empty WP feed was treated like a WP outage, so it
  showed 4 FAKE "preview content" sample articles ("Court to everywhere" etc.). Fixed both layers so an
  empty feed renders the real clean empty state (masthead + i18n `blog.empty` "No stories yet. Check back
  soon."), nothing fake: `js/blog.js` `getList` (a valid empty array is real, not a fallback trigger) +
  `scripts/gen-blog.mjs` (new `wpReachable` flag distinguishes empty-feed from blip; empty bakes an empty
  index + cleans orphaned post files; only an actual outage preserves last-known-good). The gate/
  "coming soon" page (`index.html` at `/`) was untouched throughout (Mike double-checked, panicked it was
  removed — it never was).
- **Blog header collision fix.** On `/blog` mobile the account icon overlapped the centered CLOUDSKIN
  wordmark (3 icons overflow the 3-col grid track). Root cause: the mobile hide-rule
  `.nav__icons a[href="login.html"]` used an EXACT match, but `/blog` subpath pages emit an ABSOLUTE
  `/login.html`, so it missed them. Fixed to ends-with: `a[href$="login.html"], a[href$="account.html"]`
  in `css/main.css`. Blog header now matches the clean home layout (search + bag only on mobile).
- **Blog NUMBERED PAGINATION (feat, verified with 25 + 100 mock posts).** Before: no pagination anywhere —
  client only fetched 12 posts (post #13+ never appeared live), static bake dumped ALL into one endless
  grid. Now: `js/blog.js` `getList` fetches the FULL archive (paginated 100/req), `renderIndex` renders a
  windowed numbered pager (`‹ 1 … 5 6 7 … 11 ›`), `PER_PAGE` cards/page (from `blog-config.js perPage`,
  default 9), featured on page 1 only, `?page=N` URL sync + browser back/forward (popstate), category
  filter resets to page 1. `gen-blog.mjs` mirrors it (bakes page 1 + a static pager via `staticPagerHTML`
  for first-paint/no-JS/crawlers; every post also has its own static page + sitemap entry so page-2+ posts
  stay crawlable). Pager strings `blog.prev/next/page/pager` (EN+EL, other langs fall back to EN aria).
  Verified in-browser: page math, last-page trim, windowing, deep-link, filter reset, mobile no-overflow,
  back-button. Used a temporary `?mock=N` hook in getList to test, then REMOVED it before commit.
- All shipped: commits `b29a031`, `3d6219f`, `20ff045`, `f5c7c8e` on `main`, deployed to prod
  (`dpl_697USBddJsQacHYfYdDJJ2SBrfTo` last). Home PC just needs `git pull` in `cloudskin-v67`.

## RESOLVED since 20260728 (do NOT re-do)
- **Draft-invoice email: Mike confirmed it is FIXED/applied** in Shopify (was "corrected but not applied"
  in 20260728). Corrected template still in repo `shopify-emails/draft-order-invoice.liquid`
  (`subtotal_line_items` + `line.line_price` + guarded `shipping_price`, no tax row).
- **Post-purchase 404 + thank-you: confirmed in source, live.** `create-checkout-session` success_url
  default `${SITE}/account?order=success&session_id={CHECKOUT_SESSION_ID}`; `account.html` shows the
  "Order Confirmed" banner via `orderConfirm()` on `?order=success`. (Real end-to-end test happens once
  the store opens; store is still behind the coming-soon gate.)
- **Stripe "tax calculation" email = MARKETING, no action needed.** It links Stripe's generic
  "Collect tax with Checkout" how-to (`utm_campaign=tax-how-to-integrate`). Checkout deliberately runs
  `automatic_tax:{enabled:false}` (see `supabase/functions/_shared/session-params.ts`) because CloudSkin
  prices are DDP (duties/tax baked in). Turning Stripe Tax on WITHOUT re-basing prices would double-charge.
  Whether tax collection is legally required is a UAE-registration/nexus question for Mike's accountant,
  not a code change — left as-is.

## PENDING (pick up here)
- **SEO team WordPress account — waiting on their email.** Mike asked them for it. Direction: create them
  an **Administrator** account (Mike's call — "it's their job"; I flagged the risk and preferred Editor,
  but Admin is what he wants). They set their own password from the WP invite email (I never handle it).
  No SEO plugin installed yet — they can install Rank Math/Yoast themselves (Admin allows it). NOTE: the
  blog is still `noindex,nofollow` + gated, so their work won't rank until the public-launch toggle; set
  that expectation with them. Ready-to-send ask-for-email + onboarding messages were drafted this session.
- **Studio "Publish to site" (Layer-2 auto-rebake) still NOT activated** (unchanged from 20260728): needs
  Mike to create a Vercel Deploy Hook, `insert into app_secrets ('VERCEL_DEPLOY_HOOK_URL','<url>')`, then
  `supabase functions deploy studio-publish --no-verify-jwt`.
- **PayPal** still waiting on Larissa's Live REST API Client ID + Secret (see 20260728).
- **Public launch of the blog** (when Mike says go, per `docs/BLOG-PIPELINE.md`): flip `noindex,nofollow`
  → `index,follow` in `gen-blog.mjs`, remove the gate script from blog pages, flip `robots.txt`, redeploy,
  submit sitemap. Gated on Mike's go, not requested yet.
- **Housekeeping:** EasyWP SFTP scratch scripts (contain time-boxed SFTP creds) still in the session
  scratchpad; leftover EasyWP `v=spf1 include:easywp.com` TXT on `@` conflicting with Google Workspace MX
  (deliverability risk, from 20260728, not yet fixed). WP core `wp2shell` update (7.0.2) not applied.
