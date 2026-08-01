---
name: cloudskin-deploy-setup
description: "How to deploy CloudSkin to production now — the agent can do it AUTOMATICALLY via one command; the canonical folder (CHECK THIS EVERY SESSION, it keeps moving), and the npx/vercel-login/PowerShell prereqs that caused a long ordeal on 2026-07-24"
metadata: 
  node_type: memory
  type: project
  originSessionId: d267c573-c8a4-4c8c-b679-a6247a2e102f
  modified: 2026-08-01T16:52:03.277Z
---

CloudSkin production deploys are now AUTOMATIC from the agent. **The canonical source folder keeps changing (v52 -> v54 -> v55 -> v56 -> v67 so far) — do NOT trust this file's folder name blindly.** Before touching anything, verify with `ls /c/Users/mikef/ | grep -i cloudskin-v` and check `git log -1 --format=%cI` in each candidate to find the one with the most recent commit — that's the live one. As of 2026-08-01 the canonical folder is `C:\Users\mikef\cloudskin-v67` (v56 is DEPRECATED — Mike explicitly said to forget it; an agent mistakenly edited v56 once on 2026-08-01 and had to be stopped/reverted and redirected to v67). The one deploy command (update the folder name to whatever you just confirmed is current):

`node C:\Users\mikef\cloudskin-v67\scripts\deploy.mjs`

(ROOT resolves from the script's own path via `import.meta.url`, so it runs from any cwd.) It re-bakes `js/content-snapshot.js` from live Supabase first (prevents the old-photo flash), then `vercel deploy --prod --scope webactionhellascom`, then verifies the served snapshot deep-equals live. Rollback: `vercel promote <prev dpl_...> --scope webactionhellascom`.

**The agent can run it itself now — Mike wants this fast automatic flow (no terminal/clicks from him).** He added to `C:\Users\mikef\.claude\settings.json`:
`"permissions": { "allow": ["Bash(node /c/Users/mikef/cloudskin-v56/scripts/deploy.mjs)"] }`
so the auto-mode classifier no longer blocks THIS deploy. **NOTE: that allow-rule string is hardcoded to the OLD v56 path and has NOT been updated for v67** — running the v67 deploy command may prompt for permission again until Mike (or an update-config pass) adds a matching allow rule for the v67 path. Don't assume it's silent until verified.

**Prereqs that caused a long ordeal on 2026-07-24 (all now sorted):**
- vercel CLI is NOT globally installed on this machine, so `deploy.mjs` was patched to call `npx --yes vercel ...` (fetches vercel on the fly). Keep it as npx.
- vercel is now LOGGED IN (webactionhellascom team), auth persists. If login is ever needed again, use `npx.cmd vercel login` (NOT plain `npx` — Windows PowerShell ExecutionPolicy blocks `npx.ps1`; the `.cmd` bypasses it). deploy.mjs's internal npx works because spawnSync `shell:true` routes through cmd.exe.
- The auto-mode classifier hard-blocks the AGENT from editing `settings.json` to grant itself deploy permission (self-escalation guard) and from browser navigation — so the allow rule had to be added by Mike himself (done). Give him a single PowerShell `... | Set-Content settings.json` line rather than the Notepad dance (he had no Notepad / dislikes terminal editing).

Current prod includes the fixed "Complete the Look" section (deterministic reveal so cards no longer flash-then-disappear, `object-fit:cover` uniform card sizes, and `_studioImgs` seeded in `fill()` so cards show Larissa's Studio photos not catalogue defaults).

See [[cloudskin-studio-live-and-pending]], [[cloudskin-site]].
