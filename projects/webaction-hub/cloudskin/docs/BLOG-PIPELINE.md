# CloudSkin Journal, blog auto-publish + auto-translation pipeline

How a writer clicking **Publish** in WordPress makes cloudskin.com/blog rebuild
itself (in the cloud, hands-off), with English + Arabic pages baked and
SEO-complete. This is the operational runbook: what the pieces are, the one-time
setup, how to test, and how to launch.

Store status: still GATED (access gate + noindex + robots Disallow). Every rebuild
preserves the gate. Un-gating is a separate step (see "Public launch" at the end).

---

## The chain

```
  writer clicks Publish (WordPress, EasyWP)
        |
        v
  wp-content/mu-plugins/cloudskin-rebuild.php      (fires on publish/update/trash,
        |   POST + shared secret                    non-blocking, debounced)
        v
  Supabase edge fn  blog-rebuild                    (checks the shared secret, then
        |   repository_dispatch "blog-publish"       calls GitHub with a token that
        v                                            lives ONLY in Supabase secrets)
  GitHub Action  .github/workflows/blog-rebuild.yml (regenerate /blog from live WP,
        |                                            translate EN+AR cache-aware,
        |                                            commit the cache back)
        v
  node scripts/deploy.mjs  (VERCEL_TOKEN)           -> Vercel production (gate intact)
        |
        v
  cloudskin.com/blog + cloudskin.com/blog/ar/...    live in ~1 to 2 minutes
```

Why the extra edge-fn hop instead of WordPress calling GitHub directly: WordPress
is client-managed and less trusted, so it only ever holds a **rotatable shared
secret**. The **GitHub token stays in Supabase**. Rotate the WP secret any time
without touching GitHub.

Why a GitHub Action instead of a Vercel Deploy Hook (the earlier idea in
`blog-autopublish.md`): the translation **cache must be committed back to git** so
a 1000-post archive is translated once, not re-translated on every publish. A
Vercel build is ephemeral and cannot commit back; a GitHub Action can. This is the
reason the Action architecture was chosen and the Deploy-Hook idea dropped.

---

## The pieces (all committed, all currently INERT/safe)

| Piece | File | State without setup |
|---|---|---|
| Publish trigger | `wordpress/mu-plugins/cloudskin-rebuild.php` | inert (placeholder secret -> never pings) |
| Secret-gated bridge | `supabase/functions/blog-rebuild/index.ts` | fail-closed (no secret -> 503) |
| Rebuild + deploy | `.github/workflows/blog-rebuild.yml` | never runs (no dispatch reaches it) |
| SSG + translation | `scripts/gen-blog.mjs` + `scripts/translate-posts.mjs` | English-only if no API key |
| Deploy command | `scripts/deploy.mjs` | CI-ready via `VERCEL_TOKEN` |

Translation is **off by default**: with no `ANTHROPIC_API_KEY`, `gen-blog` logs
"translation OFF, English-only" and ships English. Turning it on is one secret.

---

## One-time activation (human steps)

Do these once. Until all of Section A + the mu-plugin are in place, the blog keeps
working English-only on the normal manual `node scripts/deploy.mjs`.

### A. GitHub repository secrets  (repo: `webactionhellas-dev/cloudskin-v67`)
Settings -> Secrets and variables -> Actions -> **New repository secret**:

1. `VERCEL_TOKEN` — a Vercel **team** token. Create at Vercel -> Account Settings ->
   Tokens, scope it to the `webactionhellascom` team. (Team-authored -> bypasses the
   git-author block that stops CLI deploys.)
2. `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` — from `.vercel/project.json` locally, or
   Vercel project -> Settings -> General. (`orgId` and `projectId`.)
3. `ANTHROPIC_API_KEY` — an Anthropic API key (this is the translation engine).
   Omit this one and the pipeline still runs, English-only.

Optional **repository variables** (Settings -> Variables tab) to tune translation
without editing the workflow:
- `BLOG_LANGS` (default `ar`) — which non-English languages to bake. `ar,fr` for
  more; `all` for every site language. English is always the source.
- `TRANSLATE_MODEL` (default `claude-haiku-4-5`) — see the cost table below.
- `TRANSLATE_ENGINE` (default `claude`) — set `mock` for a free dry-run, `none` to
  force English-only.

### B. Supabase Edge Function secrets  (project `ocszztflphqsaoyhlerx`)
Dashboard -> Edge Functions -> **Secrets** (or Project Settings -> Edge Functions):

4. `BLOG_REBUILD_SECRET` — a long random string you invent. This is the WordPress
   shared secret. (Generate e.g. `openssl rand -hex 24`.)
5. `GITHUB_DISPATCH_TOKEN` — a GitHub token allowed to POST repository dispatches:
   a fine-grained PAT scoped to `webactionhellas-dev/cloudskin-v67` with
   **Contents: Read and write**, or a classic token with the `repo` scope.

The `blog-rebuild` function is already deployed (inert). Once 4 + 5 are set it goes
live automatically; no redeploy needed. Verify with a GET:
`https://ocszztflphqsaoyhlerx.supabase.co/functions/v1/blog-rebuild` should return
`{"ok":true,...,"configured":true}` once both secrets exist.

### C. WordPress mu-plugin  (EasyWP: cloudskin-journal-13d6d4e.ingress-haven.ewp.live)
6. In EasyWP -> File Manager, upload `wordpress/mu-plugins/cloudskin-rebuild.php` to
   `wp-content/mu-plugins/cloudskin-rebuild.php` (create the `mu-plugins` folder if
   absent). It activates automatically.
7. Set the shared secret to the SAME value as `BLOG_REBUILD_SECRET`. Preferred:
   add to `wp-config.php` `define('CLOUDSKIN_REBUILD_SECRET', 'the-secret');`
   (avoids editing the plugin file). The URL constant already points at the fn.

That is the whole activation. From then on: writer publishes -> site rebuilds.

---

## Translation model cost table

Every `(post, language)` pair is cached in `blog/i18n-cache/<slug>.<lang>.json`,
keyed by a hash of the English source. A rebuild only calls the API for **new or
changed** posts; unchanged posts cost nothing. So the model choice only affects the
**first** translation of each post.

| `TRANSLATE_MODEL` | When to use |
|---|---|
| `claude-haiku-4-5` (default) | High-volume translation. Cheapest, fast, strong quality for this low-risk copy. Recommended. |
| `claude-sonnet-5` | If Arabic editorial nuance needs a lift. Mid cost. |
| `claude-opus-5` | Highest quality, highest cost. Overkill for blog translation at volume. |

Check current per-token pricing at anthropic.com/pricing. The cache means the
steady-state cost is roughly "one Haiku call per newly published post per language,"
not per deploy.

---

## Testing

**Free dry-run (no API cost, proves the whole pipeline):**
```bash
TRANSLATE_ENGINE=mock BLOG_LANGS=ar node scripts/gen-blog.mjs
```
Confirms it bakes `blog/ar/<slug>.html` with `dir="rtl"` + `lang="ar"`, hreflang
alternates, an `blog/i18n-cache/<slug>.ar.json` cache entry, and Arabic entries in
`sitemap.xml`. (Mock prefixes short fields with `[Arabic]` and leaves the body in
English by design; it is a pipeline harness, not a translation.) Restore with
`git checkout -- blog/ && git clean -fd blog/ar blog/i18n-cache` afterward.

**Real translation, local:**
```bash
ANTHROPIC_API_KEY=sk-... BLOG_LANGS=ar TRANSLATE_MODEL=claude-haiku-4-5 \
  node scripts/gen-blog.mjs
```

**Full end-to-end (after activation):** publish a throwaway post in WordPress, watch
the Action run under repo -> Actions -> "blog-rebuild", confirm the new post appears
at cloudskin.com/blog and cloudskin.com/blog/ar/<slug>. Then trash the throwaway
post (a rebuild fires and removes it).

**Manual rebuild any time:** repo -> Actions -> blog-rebuild -> "Run workflow".

---

## Operational notes

- **Gate preserved:** every rebuild ships the committed HTML, so the store gate +
  noindex + robots Disallow stay on. Auto-publish does NOT expose the store.
- **Push-auto-deploy stays OFF.** The only thing that deploys is the token deploy in
  the Action. The Action's own cache commit is marked `[skip ci]` and, because
  push-auto-deploy is off, never triggers a second build.
- **Debounce:** the mu-plugin dedupes per post (10s transient); the Action collapses
  a burst via `concurrency: cancel-in-progress`. Rapid successive publishes = one
  build on the latest state.
- **Fail-safe:** if WordPress is unreachable at build time, `gen-blog` keeps the
  last-known-good generated pages and exits 0 (never ships an empty blog). A failed
  translation for one language falls back to the English client layer for that URL
  and retries on the next build (never cached as good).
- **Rotating the WP secret:** change `BLOG_REBUILD_SECRET` (Supabase) and the
  mu-plugin's `CLOUDSKIN_REBUILD_SECRET` (WordPress) to the same new value. GitHub is
  untouched.

## Public launch (separate, gated on Mike)

When the store goes public:
1. In `scripts/gen-blog.mjs` `postHeadHTML`, flip the baked `noindex,nofollow` to
   `index,follow` (one line), same as the rest of the store.
2. Remove the gate `<script>` from `blog.html` / `blog-post.html` alongside the
   store's un-gating, and flip `robots.txt`.
3. Redeploy. Submit the sitemap.
