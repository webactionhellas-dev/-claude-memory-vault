---
name: aster-laptop-brain-setup
description: "this \"aster\" laptop's brain-transplant state — memory vault is git-backed to a private GitHub repo, launch.json is stale (all mikef paths)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3f46d3d2-8f8a-4cce-a970-e227ac632228
  modified: 2026-07-31T22:17:41.805Z
---

This is a third machine (user `aster`, after `mikef` home and `nospa` office) that received the transplanted Claude fleet setup — same skills/agents/CLAUDE.md as [[office-brain-integration]], done tonight (2026-08-01) via a browser chat session alongside Obsidian setup.

**Memory vault backup — DONE, verified 2026-08-01.** `C:\Users\aster\.claude\memory` is a git repo (`git log`: "Initial Obsidian memory vault" → "Add gitignore for Obsidian config") pushed clean to a **private** GitHub repo `arxidatos1600/claude-memory-vault`. `.gitignore` excludes `.obsidian/`. Working tree was clean and in sync with origin/master when checked. This same folder is opened directly as an Obsidian vault (per `obsidian.json`), so the `[[wikilink]]` graph between memory files is browsable in Obsidian AND version-controlled. No secrets found in a scan of the tracked files.
**How to apply:** don't re-solve "back up the memory" as a problem — it's solved. If a future memory-heavy session wants durability, just remind the user to `git add -A && git commit && git push` in that folder periodically (no automation was requested or built).

**Second vault is empty/unused.** `C:\Users\aster\OneDrive\Έγγραφα\Obsidian Vault` exists with only a default `Welcome.md` — not yet decided whether it becomes a personal-notes vault separate from the memory vault, or gets merged. Unresolved as of 2026-08-01.

**launch.json is fully stale on this machine.** All 16 entries in `C:\Users\aster\.claude\launch.json` point at `C:\Users\mikef\...` paths (cloudskin, drip-store, unicorn-tattoo, mykonos-prestige, capanna, etc.) — none of those project folders exist on `aster`. Same for a few memory files with hardcoded source paths (x-tracker.md, eposburger-site.md, dionyssos-hotel-site.md — those describe projects whose code lives only on the mikef machine).
**How to apply:** before using `preview_start` with any named config on this machine, expect it to fail until either the project folder is copied over and the path in launch.json is repointed, or the entry is pruned as dead. Don't assume this machine can preview any of Mike's existing sites out of the box.
