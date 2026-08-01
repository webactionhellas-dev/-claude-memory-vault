---
name: obsidian-vault-and-scheduled-audits
description: "Mike's memory folder is now also an Obsidian vault; two scheduled Claude Code tasks run weekly (fleet health-check, memory consolidation)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4bc079d7-c87e-48c0-8d5c-f2ba92a4efc5
  modified: 2026-07-30T17:01:29.623Z
---

Mike's memory folder (`C:\Users\mikef\.claude\projects\C--Users-mikef\memory\`) is now also open as an Obsidian vault. The files already used frontmatter + `[[wikilinks]]`, so no conversion was needed — just "Open folder as vault". Obsidian was installed fresh on this machine (wasn't present before): `C:\Users\mikef\AppData\Local\Programs\Obsidian\Obsidian.exe`, no Start Menu entry the computer-use tool could resolve, so vault selection had to be done by hand.

Two Claude Code scheduled tasks are now running (created 2026-07-30):
- `weekly-fleet-health-check` — Monday 8:07am, read-only audit (Supabase `get_advisors`, Vercel runtime errors/analytics, `security_audit.py`/`design_audit.mjs`) across live sites, starting with CloudSkin.
- `weekly-memory-consolidation` — Sunday 6:02pm, runs the `consolidate-memory` skill over the memory folder, instructed to preserve frontmatter/wikilink syntax since Obsidian depends on it.

**Why:** Mike asked how to make the Claude Code setup on this machine more powerful; this was the concrete first round. Researched further options same session: Dynamic Workflows/"ultracode" multi-agent orchestration (opt-in per task or via `/config`, not something Claude can toggle itself), Opus 5 (1M context) as a model override for high-judgment calls, and local AI once the RTX 3060 in [[local-ai-pc-upgrade]] actually lands (confirmed via live hardware check 2026-07-30 that the machine is still on the RX 570 — upgrade hasn't happened yet).
**How to apply:** Don't recreate these scheduled tasks if asked again to "set up monitoring" — check `list_scheduled_tasks` first. When editing memory files, remember they're also read live as an Obsidian vault, so keep frontmatter/wikilink syntax valid and don't hand-edit Obsidian's own `.obsidian/` config.
