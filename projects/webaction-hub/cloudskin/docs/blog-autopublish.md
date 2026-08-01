# CloudSkin Journal — auto-publish design (WordPress publish -> site rebuilds itself)

> SUPERSEDED (2026-07-28). The auto-publish pipeline was BUILT using a GitHub Action
> (not the Vercel Deploy Hook sketched below), because the translation cache must be
> committed back to git to persist across rebuilds, which a Vercel build cannot do.
> The live runbook is **`docs/BLOG-PIPELINE.md`**. This file is kept only for the
> mu-plugin snippet and the design rationale.

Status: original recommendation, kept for reference. The SSG blog is built and wired
into `scripts/deploy.mjs`; the implemented trigger chain lives in `docs/BLOG-PIPELINE.md`.

## Where we are now
- The blog is headless: writers publish in WordPress (`cloudskin-journal-13d6d4e.ingress-haven.ewp.live`),
  and `scripts/gen-blog.mjs` pulls those posts and writes fully pre-rendered, SEO-baked static pages
  under `/blog`. This runs automatically as part of `node scripts/deploy.mjs`.
- So TODAY: a new post appears on cloudskin.com the next time someone runs a deploy. That is not yet
  hands-off for the writers — someone still has to trigger a deploy.
- Deploys are LOCAL + manual by design (`node scripts/deploy.mjs` bakes everything locally then
  `vercel deploy --prod`). Vercel is NOT set to auto-deploy from GitHub (the ~10-min GitHub "Sync"
  commits are a backup MIRROR only). The gate/noindex/robots are kept every deploy.

## Recommended auto-publish architecture (hands-off for the writing team)
Trigger a blog-only rebuild whenever a writer hits Publish, WITHOUT turning on push-based
auto-deploy (which would fire on every 10-min sync and defeat the launch gate).

1. **Vercel Deploy Hook (manual trigger URL).** In the Vercel project (prj_6d0gmXALxXTKZFj7AAVoBZfns12W,
   team webactionhellascom) -> Settings -> Git -> Deploy Hooks: create a hook on the `main` branch
   named e.g. `wp-publish`. This yields a secret URL. Triggering it starts ONE build; it does not
   enable auto-deploy-on-push. Keep "Production Branch" auto-deploy OFF.
2. **Vercel Build Command = blog only.** Set the project's Build Command to `node scripts/gen-blog.mjs`
   (it regenerates `/blog/*` from live WordPress and rewrites `sitemap.xml`). It needs NO secrets
   (only the public WordPress REST API), so it is safe to run on Vercel. The rest of the site ships
   from the repo as-is. The store's content-snapshot / first-paint bakes stay on the manual CLI deploy
   (they never change on a blog publish), so blog publishing and store updates stay cleanly separate.
3. **WordPress -> the hook.** Install a small publish webhook on WordPress that POSTs the Deploy Hook
   URL when a post is published/updated. Two easy options:
   - A webhook plugin (e.g. "WP Webhooks") firing on "post published/updated" to the hook URL, or
   - A 6-line mu-plugin on `transition_post_status` (only when new status is `publish`) that does a
     `wp_remote_post()` to the hook URL. (Reusable snippet below.)
   Result: writer clicks Publish -> WordPress pings Vercel -> Vercel rebuilds `/blog` from WP ->
   live in ~1-2 minutes. No developer, no manual deploy.

### mu-plugin snippet (drop in wp-content/mu-plugins/cloudskin-rebuild.php)
```php
<?php
add_action('transition_post_status', function ($new, $old, $post) {
  if ($new !== 'publish' || $post->post_type !== 'post') return;
  wp_remote_post('PASTE_YOUR_VERCEL_DEPLOY_HOOK_URL', ['blocking' => false, 'timeout' => 2]);
}, 10, 3);
```

## Two things to resolve before wiring it
1. **Git-author block.** Vercel refuses builds whose HEAD commit author is not a team member
   (the repo's commits are authored by mikefalcos2004@gmail.com). Deploy-Hook builds build the
   latest `main` commit, so this may block them too. Fix once: set the repo's commit identity to a
   webactionhellascom team member's email (so the auto-sync commits are team-authored), OR disable
   the author check in Vercel project settings. (This is the same fix already flagged for CLI deploys.)
2. **First build after enabling.** Confirm the Vercel Build Command produces the same `/blog` output
   as the local run (it will — same script, same public WP API), and that gate + noindex are still on.

## Launch note
Generated posts carry `noindex,nofollow` (baked in `gen-blog.mjs` `postHeadHTML`) to match the
pre-launch gate. At public launch, flip that one line to `index,follow` (and remove the gate script
in `blog.html` / `blog-post.html`) alongside the rest of the store's un-gating.

## Decision for Mike
Approve this approach and I will: create the Deploy Hook, set the Build Command, verify a rebuild,
and hand Larissa the exact WordPress webhook setup. Until then, new posts go live on the next manual
`node scripts/deploy.mjs`.
