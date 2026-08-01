---
name: managed-agents-provisioning
description: "How the user provisions Anthropic Managed Agents from pasted specs on this Windows machine, and the recurring fixes"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7c59126d-c48e-4cac-b7ba-7a8de297d62d
---

The user repeatedly pastes "Create an Anthropic Managed Agent" specs (name, model, system prompt, an `ant beta:agents create` CLI command, brew-based setup steps) and wants them set up. As of 2026-06-25, three are staged, each in its own folder under `C:\Users\mikef\`: `vercel-deploy-diagnoser`, `web-scraper-agent`, `api-designer`. Each folder has `provision.py` (+ `requirements.txt`, `README.md`).

**Recurring fixes in every pasted spec** (apply without re-explaining):
- `brew install anthropics/tap/ant` is macOS/Linux — this is Windows 10. `ant` is NOT installed; `brew` is NOT installed. Python 3.12 + Node are. Default to the **Python SDK** path (`client.beta.agents.create`), not the CLI. Each `provision.py` is idempotent (reuses env/agent by name) and reads `ANTHROPIC_API_KEY`.
- The pasted `--system` value is always **truncated mid-word** — use the full system prompt from the spec body, not the CLI snippet.
- The pasted `--tool` list is often **incomplete**: if the system prompt names tools (e.g. `browser_use_extract`, `submit_extraction`), they must be declared (as `custom` tools or MCP), or the agent calls tools that don't exist.

**Standing constraints:**
- `ANTHROPIC_API_KEY` is NOT set, and the user runs `provision.py` themselves (key stays in their shell). So **nothing has actually been created yet** — all three are staged only. Don't claim creation; offer to run only if they set the key persistently (my Bash/PowerShell shells don't persist env vars between calls).
- Architecture depends on tools: MCP-server agents (Vercel diagnoser) need vault credentials and CAN run unattended via scheduled **deployments**; custom-tool agents (web scraper) need a live orchestrator holding the SSE stream and CANNOT; prebuilt-toolset-only agents (API designer) run server-side and write deliverables to `/mnt/session/outputs/`.

Reference for all Managed Agents / SDK specifics: the [[claude-api]] skill.
