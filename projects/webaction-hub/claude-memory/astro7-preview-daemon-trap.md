---
name: astro7-preview-daemon-trap
description: Why preview_start fails for Astro 7 sites (drip-astro etc.) and the two-part fix — global launch.json + foreground dev() wrapper
metadata: 
  node_type: memory
  type: reference
  originSessionId: b9f6598d-f5d5-4620-9163-c339114f0e9b
---

Two traps that together break `preview_start` for Astro 7 sites, found fixing drip-astro (C:/Users/mikef/drip-astro-test):

1. **preview_start reads the GLOBAL launch.json**, `C:/Users/mikef/.claude/launch.json` (the session cwd is C:/Users/mikef), NOT the project-local `.claude/launch.json`. Every site's config is aggregated there (drip-astro, drip-v2-old, greencleaners, unicorn-tattoo, capanna, cloudskin, ...). Editing the project-local file does nothing for preview_start. Fix the GLOBAL entry.

2. **Astro 7's `astro dev` auto-detaches into a background daemon** when it detects an agent environment (via the `am-i-vibing` package: `dist/cli/dev/index.js` → `agentDetected = !process.env.ASTRO_DEV_BACKGROUND && isRunByAgent()`). The launched foreground process exits (exit 0, prints "Dev server running at ... Stop: astro dev stop"), so preview_start thinks the server died. Setting env `ASTRO_DEV_BACKGROUND=1` disables it, but the clean fix is a foreground wrapper using the programmatic API: `scripts/dev-server.mjs` = `import { dev } from 'astro'; await dev({ root, server:{ port } })` (root derived from `import.meta.url`, not cwd, since preview_start runs it from C:/Users/mikef). Bare `import 'astro'` resolves relative to the wrapper file, so it finds the project's node_modules regardless of cwd. Global launch.json points node at that wrapper with the port as argv[2].

The old broken config pointed at a non-existent `node_modules/astro/astro.js` (real bin is `node_modules/astro/bin/astro.mjs`) — but even fixing the path only gets you to the daemon trap. Apply the wrapper to any future Astro 7 build's preview config. See [[drip-astro-v2-site]], [[preview-screenshot-timeout]].
