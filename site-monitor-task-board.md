---
name: site-monitor-task-board
description: "The site-monitor dashboard (localhost:8788) + task board Mike built 2026-08-01: what it is, where it lives, how to add tasks from a conversation, and the sync/placement decision (web dashboard stays primary, NOT an Obsidian plugin)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 70f1bde9-a5a3-4cb5-ac72-971762bb76e7
  modified: 2026-08-01T23:38:26.017Z
---

`C:\Users\mikef\site-monitor` — a zero-dep Node tool (same house style as [[x-tracker]]) with two parts on one dashboard:
1. **Site health**: checks CloudSkin, Trattoria Capanna, Drip Barbershop, Drip Astro v2, Mykonos Prestige every 10 minutes (uptime, broken images, slow pages, missing security headers), Telegram alert on any ok<->trouble transition (blank until `.env` is filled in — copy `.env.example`, same `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` var names as x-tracker).
2. **Task board**: assign work to people (Mike, Asteris, anyone), track status (todo/in_progress/blocked/done). One markdown file per task in `C:\Users\mikef\obsidian-vault\tasks\` — deliberately NOT a shared JSON file, so two people creating tasks at once can't clobber each other's file.

**Runs persistently in the background, always.** Auto-starts hidden at every Windows login via `C:\Users\mikef\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\site-monitor.vbs` (Task Scheduler creation is blocked in this sandbox - modifying existing tasks works, registering new ones doesn't - so the Startup folder was the workaround). Dashboard: **http://localhost:8788**.

**Standing behavior: when Mike assigns a task to someone in conversation ("this is for Asteris", "add a task for X"), create it immediately** via:
```
node C:\Users\mikef\site-monitor\scripts\add-task.mjs "Task title" --assignee=asteris --project=cloudskin
```
This writes the task file directly (works whether or not the dashboard server happens to be running) - don't just tell Mike to type it into the web form himself, that defeats the point of asking for this.

**Same standing behavior for sites to watch** - when Mike mentions a new live site to track, add it immediately via `node C:\Users\mikef\site-monitor\scripts\add-site.mjs "Name" "https://url"` (verifies the URL is actually reachable first) rather than hand-editing config.json or telling him to. `remove-site.mjs "Name"` to stop watching one. **Before adding ANY client-project domain, verify it's actually Mike's rebuild and not the client's pre-existing original site** - checked page `<title>` against what's known per-project 2026-08-01 before adding, a raw HTTP 200 is not enough evidence (most in-progress client rebuilds still 200 with the OLD site since the real domain hasn't been cut over yet).

**Business-model context (Mike, 2026-08-01): most of the non-CloudSkin projects (Drip Jewels, Drip Barbershop, Drip sneaker store, etc) are being built to be SOLD as going-concern businesses, domain included - they intentionally run on a Vercel staging subdomain until a sale happens, not because a domain purchase is merely pending.** Only CloudSkin and webactionhellas.com (his own agency site) are on real permanent domains today. When one of these sells, the monitored URL will need updating to whatever domain the buyer/Mike puts it on - don't be surprised these URLs are inherently temporary. Currently watching: CloudSkin, Trattoria Capanna, Drip Barbershop, Drip Astro v2, Mykonos Prestige, Web Action.

**Placement decision (Mike asked "should this be inside Obsidian?", 2026-08-01): keep the web dashboard as the primary interface, do NOT rebuild this as an Obsidian plugin/Kanban-plugin setup.** Reasoning given: the task files already live inside the vault and are plain markdown with YAML frontmatter, so Obsidian can already open/browse them as normal notes with zero plugin install - Mike/Asteris get that view for free. Rebuilding the board itself as an Obsidian community plugin (e.g. the Kanban plugin) would require a different, more rigid file format, a manual one-time plugin install on every machine that wants the visual board, and gets no functional upside over the already-working, already-auto-syncing web dashboard. If this decision ever needs revisiting, that's the tradeoff to re-litigate.

**Sync**: reuses the SAME `MemoryVaultSync` scheduled task / `obsidian-vault` git repo already documented in the CLAUDE.md standing rule and [[memory-vault-sync-incident]] - no new sync mechanism was built. `sync-vault.ps1`'s `git add -A` picks up the whole repo recursively (including the new `tasks/` subfolder); its robocopy mirroring step only touches root-level `*.md` files (non-recursive by default), so task files never bleed into Claude's live memory folder. Proven live end-to-end 2026-08-01: created tasks via the dashboard, the background sync auto-committed and pushed them to GitHub within its normal cycle with zero manual git commands.

**Known limitation**: Asteris doesn't have this dashboard's web UI running on their own machine yet - they can edit a task's `status`/`assignee` field directly in the markdown via Obsidian and it'll sync fine, but they don't get the clickable board. Setting up the same tool on Asteris's machine would need Mike to hand them the folder (or a fresh setup script) - not something doable from this machine alone.

**Real bugs caught and fixed before shipping (both verified with direct evidence, not assumed):** the broken-image checker was flagging real images as broken because it didn't HTML-entity-decode `&amp;` in extracted `src` attributes before treating them as URLs (a Vercel `/_vercel/image?url=...&amp;w=750` link) - fixed, reverified with curl. Creating two tasks with the same title on the same day silently overwrote the first task's file (same slug -> same filename) - fixed with a collision-disambiguation loop, reverified by reproducing the exact case that broke it.

**Design: "Signal Deck"** (Nami, 2026-08-01) - mission-control/telemetry concept, not a generic dark dashboard: Bricolage Grotesque (wordmark/hero numeral only, rationed), Switzer (UI text), JetBrains Mono (every data value - ms/%/timestamps/counts, consistently). Near-black `#08090c` bg, one rationed accent violet `#8567ff` kept strictly separate from the ok/warn/down semantic colors (the amber-for-both confusion in the prior rough pass was a real, caught mistake). Fonts are CDN-loaded (Google Fonts + Fontshare) - works fine but not offline-resilient, self-hosting is a nice-to-have follow-up. No real Web Action logo exists anywhere on file - header is typographic (wordmark + live pulse dot) until Mike supplies a real mark. All in `src/dashboard.js` only (server/API routes untouched).

**Also runs as a real Electron desktop app now**, not just a browser tab: `npm run app` (or the packaged form once `npm run build-app` succeeds - full packaging via electron-builder hit a Windows dev-mode/symlink permission wall in this sandbox, unresolved, dev-mode launch works fine as the interim). `electron-main.js` + `src/app.js` (shared start-up logic between the plain CLI and Electron, so there's one tested implementation, not two).

See [[x-tracker]] for the sibling tool this followed the conventions of, [[memory-vault-sync-incident]] for the sync mechanism it reuses.
