---
name: office-desktop-mirror
description: How to mirror the whole agent fleet onto a second machine (office desktop) so it works identically to home
metadata: 
  node_type: memory
  type: reference
  originSessionId: fed262b1-717a-4152-9b32-83197fb53847
  modified: 2026-07-27T07:44:50.022Z
---

Mike works on two machines (home + office desktop) and wants both to run the fleet identically.

**The "brain" is portable files under `~/.claude`:** `CLAUDE.md`, `agents/` (9), `skills/` (boss, brief, house-playbook, design-standards, autonomous-execution, website-builder + its scripts, frontend-design, ui-ux-pro-max), `projects/*/memory/` (the knowledge base + MEMORY.md), `settings.json`, `settings.local.json`, `launch.json`. ~12 MB without node_modules.

**Migration bundle staged at `C:\Users\mikef\claude-brain-migration\`:** `claude-brain/` (the brain) + `SETUP-OFFICE.ps1` (merges it into `~/.claude` non-destructively, backs up overwrites) + `README.md`. The "everything included" zip also bundles `website-builder/scripts/visual/node_modules` and the `~/AppData/Local/ms-playwright` Chromium cache (Windows x64) so the office PC needs zero reinstall/download.

**Auth is NEVER copied, always re-authed:** (1) Claude login `.credentials.json` is device-bound — re-login with `claude`. (2) Account connectors (Supabase, Vercel, Stripe, Chrome, computer-use) follow the Anthropic account login, not the folder. (3) `magic` is the ONLY local MCP server; its `API_KEY` lives in `~/.claude.json` -> `mcpServers.magic.env.API_KEY` and must be added by hand on the office side. The auto-mode classifier BLOCKS writing that key into the bundle, and that is correct: secrets must not ride in a zip.

**Client project folders are separate** (the work, not the system): `cloudskin-v67` (the CloudSkin folder rotates version-forward over time, resolve it per [[cloudskin-canonical-folder-check]]), `mykonos-prestige`, `greencleaners`, `unicorn-tattoo`, `dionyssos-hotel`, `drip-*`, etc. Bring per-project via `git clone` (most are deployed/git-backed); some carry big node_modules so `du` over all of them times out.

**CHOSEN SYNC = OneDrive (no login, Mike's pick).** Lean brain lives at `C:\Users\mikef\OneDrive\claude-brain-sync\` (claude-brain minus node_modules + `SETUP-OFFICE.ps1` + `READ-ME-FIRST.txt`, ~12 MB); OneDrive auto-syncs it to the office PC. Office setup: install Claude Code + Node LTS + Python 3.11+ -> `claude` login -> run `powershell -ExecutionPolicy Bypass -File "$env:OneDrive\claude-brain-sync\SETUP-OFFICE.ps1"` (auto npm ci + downloads Chromium ~150 MB, since the 690 MB cache is NOT synced) -> add the magic key -> `/boss`. Ongoing: edit at home, OneDrive syncs, re-run the script at the office to apply.

**UPDATE 2026-08-01 — memory no longer needs the OneDrive path.** The `projects/*/memory/` half of the brain now syncs continuously on its own through the git-backed Obsidian vault at `C:\Users\mikef\obsidian-vault\` (see [[obsidian-vault-and-scheduled-audits]]); a second machine clones that repo and mirrors it into its own memory folder. OneDrive is still the path for the rest of the brain (`CLAUDE.md`, `agents/`, `skills/`, settings).

First transfer was ALSO done via `claude-brain.zip` (Mike sent it himself). GitHub path was prepared (local repo committed at `C:\Users\mikef\claude-brain-migration`, `gh` 2.96 installed) but Mike could not get past GitHub's device-authorize step, so OneDrive won; the private-repo option remains if he ever finishes `gh auth login`.

Related: [[agency-agent-fleet]], [[mike-operator-profile]], [[website-builder-skill]].
