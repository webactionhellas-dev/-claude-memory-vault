---
name: obsidian-vault-and-scheduled-audits
description: "Mike's memory is mirrored into a git-tracked Obsidian vault shared with Asteris; two scheduled Claude Code tasks run weekly (fleet health-check, memory consolidation)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4bc079d7-c87e-48c0-8d5c-f2ba92a4efc5
  modified: 2026-07-30T17:01:29.623Z
---

Mike's memory is browsable in Obsidian. The files already used frontmatter + `[[wikilinks]]`, so no conversion was needed. Obsidian was installed fresh on this machine (wasn't present before): `C:\Users\mikef\AppData\Local\Programs\Obsidian\Obsidian.exe`, no Start Menu entry the computer-use tool could resolve, so vault selection had to be done by hand.

**UPDATED 2026-08-01 — the vault MOVED out of the memory folder.** Originally the memory folder itself (`C:\Users\mikef\.claude\projects\C--Users-mikef\memory\`) was opened as the vault. That was abandoned: something inside `.claude\` kept silently reverting local git history to the first commit and blocked git operations. The git-tracked vault now lives at **`C:\Users\mikef\obsidian-vault\`** (remote `-claude-memory-vault`, shared with Asteris and Mike's laptop), and the two folders are **mirrored** both directions by robocopy, not the same folder. Full rules live in `~/.claude/CLAUDE.md`; sync runs as the native Windows task `MemoryVaultSync`, see [[memory-vault-sync-incident]] and [[site-monitor-task-board]] (whose `tasks/` subfolder rides the same repo). Do not move the git repo back inside `.claude\`.

Two Claude Code scheduled tasks are now running (created 2026-07-30):
- `weekly-fleet-health-check` — Monday 8:07am, read-only audit (Supabase `get_advisors`, Vercel runtime errors/analytics, `security_audit.py`/`design_audit.mjs`) across live sites, starting with CloudSkin.
- `weekly-memory-consolidation` — Sunday 6:02pm, runs the `consolidate-memory` skill over the memory folder, instructed to preserve frontmatter/wikilink syntax since Obsidian depends on it.

**Why:** Mike asked how to make the Claude Code setup on this machine more powerful; this was the concrete first round. Researched further options same session: Dynamic Workflows/"ultracode" multi-agent orchestration (opt-in per task or via `/config`, not something Claude can toggle itself), Opus 5 (1M context) as a model override for high-judgment calls, and local AI once the RTX 3060 in [[local-ai-pc-upgrade]] actually lands (confirmed via live hardware check 2026-07-30 that the machine is still on the RX 570 — upgrade hasn't happened yet).
**How to apply:** Don't recreate these scheduled tasks if asked again to "set up monitoring" — check `list_scheduled_tasks` first (and for the *sync* job specifically, check `schtasks /Query /TN "MemoryVaultSync"`; it is deliberately a plain Windows task, not a Claude Code task, so a mechanical git pull/push costs zero tokens). When editing memory files, remember they're mirrored into an Obsidian vault, so keep frontmatter/wikilink syntax valid and don't hand-edit Obsidian's own `.obsidian/` config.

**RACE-CONDITION WARNING (found 2026-08-02):** `MemoryVaultSync` fires every 5 minutes and mirrors both directions. A long editing session that changes memory files can have its edits silently REVERTED mid-pass by that job. When doing a bulk memory edit (e.g. the weekly consolidation), write the change to BOTH `obsidian-vault\` and the live memory folder, then `git add/commit/push` in the vault immediately, then re-verify the files still contain the change.
