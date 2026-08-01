# CloudSkin blog auto-publish — activation checklist

The pipeline is built + deployed. This turns it ON. ~15 minutes, order A → B → C.
Self-contained: you create 2 tokens and pick 1 secret on the spot. Nothing to carry in.

The store stays GATED through all of this — auto-publish never exposes the shop.

---

## Values already known (safe to paste, not secret)

| Name | Value |
|---|---|
| VERCEL_ORG_ID | `team_fAnVpAdOPwPZAR4kW0o2BwID` |
| VERCEL_PROJECT_ID | `prj_6d0gmXALxXTKZFj7AAVoBZfns12W` |

You will also: create a **VERCEL_TOKEN**, create a **GITHUB_DISPATCH_TOKEN**, and
**pick a shared secret** (any long random string, e.g. from a password generator).
Optional: your own **ANTHROPIC_API_KEY** (enables Arabic; skip = English-only).

---

## A. GitHub repository secrets  (4)

Page: https://github.com/webactionhellas-dev/cloudskin-v67/settings/secrets/actions
Click **New repository secret** for each. Names must match EXACTLY.

**A1 — first, mint the Vercel token:**
- https://vercel.com/account/tokens → **Create Token**
- Name `cloudskin-ci` · Scope **the `webactionhellascom` team** (NOT personal — this is what lets CI deploy) · Expiration 1 year (or No Expiration)
- Create, then **copy** it (shown once).

Then add:

| # | Secret name | Value |
|---|---|---|
| 1 | `VERCEL_TOKEN` | the token you just copied from Vercel |
| 2 | `VERCEL_ORG_ID` | `team_fAnVpAdOPwPZAR4kW0o2BwID` |
| 3 | `VERCEL_PROJECT_ID` | `prj_6d0gmXALxXTKZFj7AAVoBZfns12W` |
| 4 | `ANTHROPIC_API_KEY` | your Anthropic API key *(optional; omit for English-only, add later to turn on Arabic)* |

---

## B. Supabase edge-function secrets  (2)

Page: https://supabase.com/dashboard/project/ocszztflphqsaoyhlerx/functions/secrets
(Edge Functions → Secrets → **Add new secret**.)

**B1 — first, mint the GitHub trigger token:**
- https://github.com/settings/personal-access-tokens/new (fine-grained; GitHub may ask you to confirm your password)
- Name `cloudskin-blog-dispatch` · Expiration 1 year
- **Resource owner: `webactionhellas-dev`**
- Repository access: **Only select repositories → `cloudskin-v67`**
- Permissions → Repository permissions → **Contents: Read and write**
- Generate, then **copy** it (shown once).

**B2 — pick your shared secret:** any long random string (a password generator is
perfect). You will use this SAME string again in step C. Call it `THE_SECRET`.

Then add:

| # | Secret name | Value |
|---|---|---|
| 1 | `BLOG_REBUILD_SECRET` | `THE_SECRET` (the string you picked) |
| 2 | `GITHUB_DISPATCH_TOKEN` | the GitHub token you just copied |

**Checkpoint:** open https://ocszztflphqsaoyhlerx.supabase.co/functions/v1/blog-rebuild
It should now say `"configured": true`. (Before B it says `false`.)

---

## C. WordPress mu-plugin  (Larissa, or you, in EasyWP)

The file is in this repo: `wordpress/mu-plugins/cloudskin-rebuild.php`.

1. Open it and set `CLOUDSKIN_REBUILD_SECRET` to the SAME `THE_SECRET` from B2
   (replace the `PASTE_SHARED_SECRET_HERE` placeholder).
2. EasyWP → the Cloudskin Journal site → **File Manager**.
3. Go to `wp-content/`, create a `mu-plugins` folder if it does not exist.
4. Upload the edited `cloudskin-rebuild.php` into `wp-content/mu-plugins/`.
5. Done — mu-plugins activate automatically, no Plugins-screen step.

---

## D. Test (after A + B + C)

1. Publish a throwaway post in WordPress.
2. Watch: https://github.com/webactionhellas-dev/cloudskin-v67/actions → **blog-rebuild**
   starts within seconds, finishes in ~1-2 min.
3. Check https://www.cloudskin.com/blog — the post appears.
   (With ANTHROPIC_API_KEY set: https://www.cloudskin.com/blog/ar/<slug> too.)
4. Trash the throwaway post → another rebuild removes it.

If nothing runs, re-open the B checkpoint URL and confirm `"configured": true`, and
that the WordPress secret matches BLOG_REBUILD_SECRET exactly.

---

## Notes
- No Anthropic key = blog works, English-only. Add it later and Arabic turns on automatically.
- Translation model defaults to the cheapest (Haiku); the cache means only new/changed posts ever cost anything.
- Manual rebuild any time: GitHub → Actions → blog-rebuild → **Run workflow**.
- Rotate the shared secret later: change it in BOTH Supabase and the WordPress file. GitHub untouched.
- Deeper technical detail: `docs/BLOG-PIPELINE.md`.
