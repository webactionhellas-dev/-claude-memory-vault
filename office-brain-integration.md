---
name: office-brain-integration
description: this office PC (nospa) has the home (mikef) Claude brain merged in; memory/launch paths say mikef; magic MCP still needs its key
metadata: 
  node_type: memory
  type: project
  originSessionId: 365d83ce-e165-450f-acce-c2fd30d6e5d4
  modified: 2026-07-27T09:51:58.620Z
---

On 2026-07-27 the home "claude-brain" migration bundle (built from `C:\Users\mikef`) was merged into this office machine's `~/.claude` (user `nospa`, working dir `C:\Users\nospa\claude projects`).

**Integrated:** the standing-rules `CLAUDE.md`, `settings.local.json` (permission allowlist), `launch.json`, 5 new agents (counsel, site-qa, deploy-launch, website-builder, backend-integrator) + home versions of corky/lyra/nami/twitch, the 6 core skills (boss, brief, house-playbook, design-standards, autonomous-execution, website-builder), and 47 memory files merged into the active `C--Users-nospa-claude-projects` key.

**Watch out:**
- Memory descriptions and `launch.json` reference `C:\Users\mikef\...` paths — the *knowledge* is valid but those are home-machine locations. Office client projects live elsewhere; bring each one per-project (git clone / copy) and re-point launch.json.
- The 7 richer home memory files (cloudskin-site, unicorn-tattoo-site, drip-store-site, drip-barbershop-site, eposburger-site, mykonos-prestige-site, trattoria-capanna-site) overwrote thin office stubs. Office originals + a full pre-merge snapshot are in `~/.claude/backups/brain-merge-20260727-114822`.
- `settings.json` was left as-is (the auto-mode classifier protects it); office `impeccable` hook intact. Optional un-applied home extra: the `claude-plugins-official` marketplace registration.

**Magic MCP: DONE (2026-07-27)** — the 21st.dev `magic` server is registered in `C:\Users\nospa\.claude.json` (user scope) and verified `√ Connected`; the API key came from the 21st.dev account "API key" page (21st.dev/mcp, top-right). Other connectors (Supabase/Vercel/Stripe/Chrome) ride the account login and are already active.

**CLI-path gotcha:** this is the packaged Microsoft-Store desktop app, so bare `claude` is NOT on PATH and `%APPDATA%\Claude\claude-code\` is only visible inside the app's sandbox (a normal terminal sees it under `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude-code\`). The bundled CLI that works from inside a Claude session is `%APPDATA%\Claude\claude-code\<version>\claude.exe`. `C:\Users\nospa\.claude.json` (profile root) is NOT sandbox-redirected, so it's shared between the app and a normal editor. Playwright cache restore was skipped — office already had identical versions (chromium-1228 etc.) plus Node v24 and Python 3.12. See [[mike-operator-profile]], [[agency-agent-fleet]].
