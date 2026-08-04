---
name: site-monitor-desktop-app
description: "Site Monitor.exe -- Electron desktop app built by Mike to watch Web Action's live client sites (uptime, broken images, slow pages, security-header drift), found in aster's Downloads as site-monitor-latest.zip"
metadata: 
  node_type: memory
  type: project
  originSessionId: 24ecabe2-3616-49d5-8c8c-4bb438877555
  modified: 2026-08-04T19:50:04.289Z
---

A packaged Electron app ("Site Monitor", `site-monitor-latest.zip` / `Site Monitor.exe`, ~113MB zipped) turned up in aster's Downloads on 2026-08-04. Asteris confirmed it's an app Mike created to help with the Web Action projects -- not a mystery download, not third-party software.

**What it does:** read-only monitor, no auto-fixing. Polls a configured list of live sites every `intervalMinutes` (10 by default), checks uptime/response time, broken images, TLS cert validity, and expected security headers (`strict-transport-security`, `x-content-type-options`, `x-frame-options`), and pushes a Telegram alert on state transitions (up->down, clear->warn, etc). Has a local dashboard (Electron window loading `http://localhost:8788` from a bundled Node HTTP server) plus a tray icon tinted by worst current severity.

**Source layout** (inside `resources/app.asar`): `electron-main.js` (window/tray shell) + `src/{app,checker,alerts,state,dashboard,settings,sites,tasks,lib}.js`, config-driven via `config.json` at the app root, state persisted to `data/state.json`, Telegram token via `.env` (not present in the shipped zip, so alerts are inert until configured). `src/index.js --once` runs a single check-and-exit from the CLI; calling `startMonitor()` with no flag runs the same dashboard+scheduler Electron uses, so the whole thing runs headless under plain Node too (verified 2026-08-04 by running `node src/index.js` directly and hitting the dashboard in a browser -- no Electron required to preview it).

**Drift found on first run (2026-08-04):** `config.json` monitors 6 sites -- CloudSkin, Trattoria Capanna, Drip Barbershop, Drip Astro v2, Mykonos Prestige, Web Action -- and flagged Mykonos Prestige as missing security headers. But [[live-sites-registry]] explicitly lists Mykonos Prestige as NOT live (staging/concept only, deliberately excluded from the registry as of 2026-08-01). Either the registry is stale, Mykonos Prestige went live since and the registry wasn't updated, or this app's config.json was hand-edited separately from the registry. Worth reconciling before trusting this app's alert list as authoritative -- the two lists have already diverged.

**How to apply:** if asked to check site health or extend monitoring coverage, this app and [[live-sites-registry]] / the `nightly-site-health-check` scheduled task ([[aster-local-agent-fleet-bridge]]) are two separate, currently-divergent mechanisms watching an overlapping-but-not-identical site list. Don't assume one's coverage matches the other without checking both.
