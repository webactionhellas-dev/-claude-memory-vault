---
name: project-site-monitor-v2
description: "Site Monitor v2 — Asteris's fork of Mike's Web Action internal monitoring app at C:\\Users\\aster\\site-monitor; full redesign + auth/notes/tasks build"
metadata: 
  node_type: memory
  type: project
  originSessionId: 24ecabe2-3616-49d5-8c8c-4bb438877555
  modified: 2026-08-04T20:31:28.677Z
---

**Status:** Phase 1 — specs in flight · Updated 2026-08-04
**Location:** `C:\Users\aster\site-monitor` (forked, git-init'd, baseline commit `9aa3068`)
**Preview:** `node src/index.js` → http://localhost:8788 · **Live:** internal tool, not deployed
**Stack:** zero-dependency Node >=18 + Electron. NO framework, NO build step, NO npm deps. `src/dashboard.js` (142KB) is one server-rendered template string holding the entire frontend + HTTP routes.

## Decisions (locked)
- **Fork, don't edit the shared vault.** v2 is built at `C:\Users\aster\site-monitor`, isolated from `obsidian-vault/projects/site-monitor/`. Asteris chose this 2026-08-04 over building straight into the vault, because Mike may be developing his own copy at home and the local vault branch is 76 commits behind origin. Merge back to Mike is a later, explicit step.
- **Canonical source came from git, not the zip.** Extracted via `git -C C:\Users\aster\obsidian-vault archive origin/main projects/site-monitor`. The vault copy is authoritative.
- **Layout confirmed by Asteris:** top bar = WA logo top-left + burger beside it · live status pill centre · clock, search, options, profile icon right. Below it, a horizontal band of LARGE section icons replacing the old thin left rail.
- Status colours ok/warn/down stay a real traffic light and stay hard-locked, never themeable. (TRACE tried "healthy = no colour"; reverted on Mike's explicit instruction. Do not re-propose it.)

## Gotchas
- **The WeTransfer `.exe` in Downloads is the PRE-FIX build and silently loses all data.** Its `src/lib.js` has no `WRITABLE_ROOT`, so every write targets a path inside the read-only `app.asar` and throws ENOTDIR — check history, theme settings and window bounds all reset on every restart. The vault source HAS the fix (`lib.js:12`). Verified by direct file comparison 2026-08-04. Anyone running that exe is looking at an app that cannot remember anything.
- **Third instance of one recurring layout bug.** `.titlestrip` (`dashboard.js:366`) and `.titlestrip-right` (`:372`) are flex with no `flex-wrap`, no `min-width: 0`, no shrink allowance, and NO breakpoint touches them — the three media queries (900/760/480) only adjust the sidebar, `.site-row`, `.board` and `.panel-head`. Below ~460px the right cluster (status pill + clock + 2 icon buttons ≈ 267px) overflows by 48px. Because `body { overflow: hidden }` (`:337`), that overflow is not scrollable — the content is permanently cut off, which is exactly the "covered up text" Asteris reported. Previous two overlap bugs had the same root cause (columns/containers sized to theoretical content width with zero shrink margin). **Standing order: every flex/grid container in v2 needs `min-width: 0` on shrinkable children and an explicit narrow-width behaviour.**
- Task files live in `~/obsidian-vault/tasks/` — the SHARED git repo. Creating test tasks pushes them at the whole team. Don't generate throwaway tasks while testing.
- `data/` and `.env` are gitignored and must stay that way — runtime state must never be committed.
- Preview-pane artifacts on this machine: `resize_window` does NOT fire a `resize` event at the page, so canvas-sized-by-JS elements read stale (the starfield looked broken but its handler is correct — verified by dispatching the event manually). Screenshots time out. See [[preview-screenshot-timeout]], [[preview-pane-intersectionobserver-dead]].

## Open threads
- [ ] Kerverus: v2 architecture (auth/identity, notes, cross-member tasks, data model, sync seam)
- [ ] Apollo: design direction (elite, keep starfield, big section icons, login screen)
- [ ] Feature inventory of the current app
- [ ] Confirm email→person mapping: asteris = asteriskateris2003@gmail.com, mike = mikefalcos2004@hotmail.com, panos = og42enty@gmail.com (by elimination, not stated)
- [ ] Merge conversation with Mike once v2 is real

See [[site-monitor-desktop-app]] for the discovery record, [[live-sites-registry]] for the site list this app monitors.
