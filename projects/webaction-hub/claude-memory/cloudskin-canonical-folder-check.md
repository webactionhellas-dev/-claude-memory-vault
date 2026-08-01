---
name: cloudskin-canonical-folder-check
description: "MANDATORY pre-flight before touching CloudSkin production: verify the current canonical source folder dynamically, never trust a hardcoded path from an older memory"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-07-31T20:23:14.804Z
  originSessionId: 759c7c12-6898-42a4-a6c5-08ee06e69836
---

Before ANY CloudSkin deploy, rollback, or "let me check the source" action, verify the current canonical folder — do not trust a folder name written in an older memory.

**Why:** CloudSkin's working folder gets versioned forward (`cloudskin-v52` → `v54` → `v55` → `v56` → `v67` → ...) as work continues, sometimes within the same day. On 2026-07-31 a memory ([[cloudskin-deploy-setup]], written 2026-07-24) still said `cloudskin-v56` was canonical. An agent trusted it, deployed `v56` to production over an actively-developed `v67` build that already had DHL tracking, currency-by-IP, a welcome email, a gallery-shade fix, and a blog integration live — hours of real, verified work — and wiped all of it from `cloudskin.com`. A separate memory ([[cloudskin-launch-prep-session]], written 2026-07-28) already contained an explicit, all-caps warning about exactly this — "DO NOT compare or reconcile CloudSkin to the LIVE site or to cloudskin-v56... it enraged Mike" — but it was never surfaced because it wasn't linked from MEMORY.md's index, so the agent never read it. Mike had to manually run `vercel promote` himself to undo the damage.

**How to apply — every time, before touching CloudSkin prod:**
1. List every `cloudskin-v*` folder under `C:\Users\mikef\` and check which has the most recent git commits / mtime. `git log -1 --format='%ad' --date=iso` in each candidate folder is fast and decisive.
2. Cross-check against `git log --oneline -5` in that folder — the commit messages/timestamps should match "today" or the most recent work session, not days-old.
3. Search ALL memory files matching `cloudskin-*` (not just what's indexed in MEMORY.md — `ls` the memory directory directly) for the phrase "canonical" and take the most recently-modified one's claim over an older one's.
4. If a live production deployment's metadata is available (Vercel `get_deployment` → `meta.githubCommitRepo` / `githubCommitMessage`), that is ground truth for what's actually live right now — trust it over any local memory claim.
5. Never run `vercel deploy --prod` (or any production-affecting action) from a folder without completing steps 1-4 first. A production deploy is not reversible for free — Mike has to notice and manually roll back, which is exactly what happened here.

This rule generalizes beyond CloudSkin: any project with versioned/rotating working folders needs this same dynamic check before a memory's hardcoded path is trusted for a destructive or production-facing action.

See [[cloudskin-deploy-setup]], [[cloudskin-launch-prep-session]].
