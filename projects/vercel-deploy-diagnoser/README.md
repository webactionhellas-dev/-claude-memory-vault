# Vercel Deploy Diagnoser — Managed Agent

A headless DevOps agent: on a failed Vercel deploy it fetches logs, isolates the
failing commit, and posts a root-cause report to Slack.

- **Model:** `claude-sonnet-4-6`
- **MCP servers:** Vercel, GitHub, Slack
- **Tools:** full prebuilt agent toolset + one `mcp_toolset` per server

## The flow: Agent (once) → Session (every run)

A Managed Agent is a persisted, versioned config. You create it **once**, store the
`AGENT_ID`, and your webhook handler / cron creates a **session** per failed deploy
that references the agent by ID. Never call `agents.create` in the request path.

## Prerequisites

```powershell
# Python is already installed on this machine.
pip install -r requirements.txt
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # your Anthropic API key
```

## Option A — Python SDK (recommended on Windows)

```powershell
python provision.py
```

Creates the environment + agent (reusing existing ones by name on re-run) and prints
`AGENT_ID`, `AGENT_VERSION`, and `ENV_ID`.

## Option B — `ant` CLI (version-controlled YAML)

`brew install anthropics/tap/ant` is **macOS/Linux only** and will not work here.
On Windows, install `ant` from the GitHub releases
(<https://github.com/anthropics/anthropic-cli/releases>) and put it on your PATH, then:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$ENV_ID  = ant beta:environments create --% < environment.yaml --transform id -r
$AGENT_ID = ant beta:agents create --% < vercel-deploy-diagnoser.agent.yaml --transform id -r
# Later config changes: ant beta:agents update --agent-id $AGENT_ID --version N < vercel-deploy-diagnoser.agent.yaml
```

## Runbook (run in order)

```powershell
cd C:\Users\mikef\vercel-deploy-diagnoser
pip install -r requirements.txt
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# 1) Create the agent + environment
python provision.py
#    -> save AGENT_ID, ENV_ID

# 2) Create the vault with MCP credentials (needs your OAuth tokens — see setup_vault.py)
$env:VERCEL_MCP_TOKEN = "..."; $env:GITHUB_MCP_TOKEN = "..."; $env:SLACK_MCP_TOKEN = "..."
python setup_vault.py
#    -> save VAULT_ID

# 3) Create the scheduled deployment (runs automatically every 5 min, no hosting)
$env:AGENT_ID = "agent_..."; $env:ENV_ID = "env_..."; $env:VAULT_ID = "vlt_..."
python create_deployment.py
#    -> deployment runs on a cron; test immediately with client.beta.deployments.run(<id>)
```

## How it runs automatically

- **Scheduled deployment** (`create_deployment.py`) — every 5 minutes Anthropic fires a
  session that scans for failed deploys and reports new ones. Runs on Anthropic's
  infrastructure; nothing to host. A **memory store** (`vdd-dedup`) persists processed
  deployment IDs across runs so the same failure is never posted twice.
- **Vercel webhook** (lower latency, optional) — a public HTTPS endpoint you host that
  receives Vercel's deploy webhook, verifies the signature, and on `state == ERROR` calls
  `sessions.create(agent=AGENT_ID, environment_id=ENV_ID, vault_ids=[VAULT_ID])`. This is
  ordinary app code on your side; it needs somewhere to run (Vercel function, Cloudflare
  Worker, a VM, etc.). Not built yet — ask if you want it.

## The vault is a hard prerequisite

The Vercel / GitHub / Slack MCP tools authenticate via the vault attached to each session
(`vault_ids`). Without it the deployment is created fine, but every run fails with MCP auth
errors at runtime. Hosted MCP servers want **OAuth bearer tokens**, not the services'
native API keys — obtaining each token is server-specific (see `setup_vault.py`).
