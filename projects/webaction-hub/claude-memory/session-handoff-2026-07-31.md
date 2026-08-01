---
name: session-handoff-2026-07-31
description: Snapshot of open threads at the 2026-07-31 account switch (5h limit); single entry point to resume everything in flight
metadata: 
  node_type: memory
  type: project
  originSessionId: 4bc079d7-c87e-48c0-8d5c-f2ba92a4efc5
  modified: 2026-07-31T11:35:45.528Z
---

Handoff at 2026-07-31 (Mike hit the 5h limit and switched to his other Claude account on the same PC; memory dir is the same Windows-user path so this should load). Open threads, most urgent first:

1. **DHL "No Items" on CloudSkin (URGENT, ACTIVE)** -> [[cloudskin-dhl-noitems-fix]]. Confirmed NOT a checkout bug (orders reach Shopify with items); it is a Shopify-variant customs/weight/SKU gap or DHL-app config. backend-integrator (Echo) was launched with the full brief but likely did not finish before the switch. RESUME: re-launch backend-integrator with that brief, or inspect Shopify order 7788469551403 directly. Larissa awaits an update (draft a WhatsApp reply only with Mike's OK).

2. **Drip hero video (PENDING Mike's iPhone test)** -> [[hero-video-av1-reencode]]. Deployed H.264-only to prod (AV1 removed because iOS 17+ will not autoplay AV1). Page weight 10MB->6MB, autoplay verified in desktop browser only. WAITING on Mike to confirm on his real iPhone (Low Power OFF, hard reload drip-store-orpin.vercel.app) that the hero autoplays with no tap. If it STILL needs a tap: check Low Data Mode, the H.264 encoding profile, and per-site Safari autoplay setting.

3. **Deploy automation (DONE, working)** -> [[house-deploy-automation]]. `node C:\Users\mikef\.claude\scripts\deploy-site.mjs <dir>` deploys any site, no prompts, self-gated. Proven on the drip deploys this session.

4. **Obsidian (mostly done)** -> [[obsidian-vault-and-scheduled-audits]]. Graph is now color-coded by memory type (`.obsidian/graph.json`); Mike must Ctrl+R reload to see it, and if the dots stay grey the type-query format needs changing (nested `metadata.type` frontmatter). NOT done / offered: a native Bases table dashboard, and switching Obsidian to light theme (better for Mike's dark-tone visibility, see [[mike-dark-tone-visibility]]).

**Still-open small items from this session:**
- The 14 read-only permission patterns from the fewer-permission-prompts pass were handed to Mike as a paste block but were NOT confirmed pasted into `~/.claude/settings.json` (the classifier blocks me editing permissions; only the deploy-site.mjs permission is confirmed in).
- `deploy-launch` agent model is still `inherit` (my edit to set it cheaper was classifier-blocked); `site-qa`->haiku and `twitch`->sonnet DID apply.
- Optional: 3 heavier drip images (store-hero.webp 497KB, about/hero.webp 430KB, about/fashion.webp 306KB) could be optimized (soft-warn only).
- This session also: added the deploy-gate PreToolUse hook (`~/.claude/hooks/deploy-gate.mjs`), fixed a real security_audit.py JWT false-positive + node_modules image over-count, and built perf_probe.mjs (real runtime perf, now in [[house-playbook]]).
