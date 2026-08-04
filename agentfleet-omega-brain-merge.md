---
name: agentfleet-omega-brain-merge
description: "arxidatos1600/agentfleet GitHub repo is Mike's portable Claude brain/fleet source; merged onto this aster/Lenovo machine 2026-08-02, adding the omega/Atlas fleet alongside the existing boss-master fleet"
metadata: 
  node_type: memory
  type: reference
  originSessionId: c7b03d4a-780f-440b-9b50-f1c4b08c1b1d
  modified: 2026-08-02T01:53:40.116Z
---

`https://github.com/arxidatos1600/agentfleet.git` (public) is a portable Claude Code "brain" export: `CLAUDE.md` + `agents/` + `commands/` + `skills/`, built on another of Mike's machines and pulled down onto this one ("this device [lenovo]", user `aster`) on 2026-08-02.

**What it is:** a newer, more evolved iteration of the same web-agency doctrine already on this machine (see [[agency-agent-fleet]], [[website-builder-skill]]). Confirmed via diff: the `autonomous-execution` and `frontend-design` skills were byte-identical to what was already here, and the incoming `house-playbook` skill was a strict superset (added `references/` with design-gate.md, security-gate.md, quality-gate.md, typography.md, motion.md, etc. + `scripts/` with imgtools.py, perf_audit.py, security_audit.py) — same house hard rules (no em-dashes, native Greek, mobile-viewport svh/lvh rules) now consolidated there instead of restated in CLAUDE.md.

**New agent roster added (Atlas/omega fleet, Greek-god names), coexists with the existing boss-master fleet — no name collisions:**
`atlas` (orchestrator, `/omega` trigger) → `helios` (research) → `hypnos` (site teardown/rebuild intake) → `apollo` (frontend design, ~ nami) → `athena` (copy, ~ lyra) → `ares` (backend, ~ echo) → `kerverus` (app/product architect, new) → `hera` (QA gate, ~ site-qa) → `hephaestus` (debug/optimize, ~ corky) → `eos` (deploy, ~ deploy-launch) → `hyperion` (security/privacy/compliance, new) → `iris` (client-facing docs, new) → `thanatos` (enforcer/anti-slop, new). Plus support files: DESIGN-FLEET.md, HANDOFFS.md, brand-stylist, logo-cutout, marko(-design-dna/-prospect-site-playbook), microcopy, overseer, site-auditor, translator, ui-designer, vercel-expert.

**61 new non-fleet skills also added:** dev/research tooling — arxiv, github-code-review/issues/pr-workflow, google-workspace, linear, docker-management, vercel-cli-with-tokens/vercel-optimize/deploy-to-vercel, vector DBs (chroma, faiss, pinecone, qdrant), ML (huggingface-hub, llama-cpp, vllm, flash-attention, grpo-rl-training, stable-diffusion, whisper), blockchain (base-blockchain, solana, polymarket), a full `hermes-*` suite (compress/insights/memory/persona/route/search/skill/traj), plus commit-archaeologist, systematic-debugging, test-driven-development, scope-creep-detector, project-graveyard, thinking-out-loud, and others.

**CLAUDE.md was replaced** with the incoming (newer) version, with this machine's local `## Memory` section (the ~/.claude/memory/MEMORY.md instruction) manually re-appended since the incoming file didn't have it. Old CLAUDE.md, agents/, skills/ backed up to `~/.claude/backups/pre-agentfleet-merge-2026-08-02/` before any changes.

**How to apply:** on this machine, both fleets are now callable — the old boss-master/echo/nami/corky/site-qa/deploy-launch/website-builder chain, and the new `/omega` → Atlas → {helios,hypnos,apollo,athena,ares,kerverus,hera,hephaestus,eos,hyperion,iris,thanatos} chain. `house-playbook` and `autonomous-execution` are shared/canonical across both. If asked to pull `agentfleet` again later (it may keep evolving on Mike's other machines), re-diff before overwriting — don't assume a re-pull is a no-op.
