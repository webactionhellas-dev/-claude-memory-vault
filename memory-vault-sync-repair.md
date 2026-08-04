---
name: memory-vault-sync-repair
description: "How the aster memory vault silently desynced (76 commits behind, two divergent stores) and the repair now baked into sync-vault.ps1"
metadata: 
  node_type: memory
  type: project
  originSessionId: 93cce21d-35f7-4bdf-8adb-d21fd7ad80c4
  modified: 2026-08-04T20:38:06.044Z
---

On 2026-08-04 the aster vault was found **5 ahead / 76 behind** `origin/main`
(`webactionhellas-dev/-claude-memory-vault`), and the two memory stores had forked into
different content: `C:\Users\aster\.claude\memory` (85 notes, live) vs
`C:\Users\aster\obsidian-vault` (88 notes). Repaired to 105 notes on both sides, one
merged 99-line index, 0 ahead / 0 behind.

**Three independent causes, all silent:**

1. `sync-vault.ps1` resolved memory only under `~\.claude\projects\C--Users-<user>*\memory`.
   Current Claude Code keeps it at **`~\.claude\memory`**, which that scan can never match,
   so on aster the mirror never ran. The five `.claude\projects\*\memory` folders are stale
   duplicates (all frozen at 2026-08-03) and are now inert but still on disk.
2. A bare `git pull` aborts on divergent branches, and every git call was piped to
   `Out-Null`, so the failure was invisible. That is how it reached 76 behind.
3. `robocopy /XO` (newest-wins) was applied to `MEMORY.md` too. It is an **index**, so
   newest-wins silently drops every line the other machine added. 40 live-only and 16
   vault-only lines had already been lost this way.

**How to apply:**
- `sync-vault.ps1` now prefers `~\.claude\memory`, falls back to the old project-key scan,
  uses `git pull --no-rebase --no-edit`, logs failures to `.sync-log.txt` (gitignored), and
  **union-merges `MEMORY.md`** keyed on the link target instead of copying it.
- Never let a newest-wins copy touch an index or aggregate file. Merge it by key.
- When a sync script swallows output, assume it is failing until a log proves otherwise.
- Only `.obsidian/appearance.json`, `community-plugins.json` and `graph.json` conflict when
  merging this vault across machines. Keep local for the first two, take remote for graph.
- Pre-merge safety ref left at branch `backup/pre-sync-2026-08-04` (c4fb38c).

Related: [[aster-laptop-brain-setup]], [[obsidian-asteris-theme]],
[[powershell-utf8-bom-json-trap]], [[github-account-topology]]
