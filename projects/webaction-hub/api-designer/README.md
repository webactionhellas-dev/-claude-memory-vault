# API Designer — Managed Agent

Designs REST + GraphQL APIs: OpenAPI 3.1 specs, auth/versioning/pagination patterns,
webhooks, error catalogs, Postman collections, and migration guides.

- **Model:** `claude-sonnet-4-6`
- **Tools:** prebuilt agent toolset only (`agent_toolset_20260401`)

## What was corrected from the pasted spec

- `brew install anthropics/tap/ant` is macOS/Linux only — this uses the Python SDK
  (Windows + Python already present).
- The pasted `--system` was truncated at `...webhooks, bulk operat`; `provision.py` uses
  the full prompt.

The tool config needed **no** changes: a design agent that writes spec files just needs
the prebuilt toolset. No custom tools, MCP servers, vault, or orchestrator — which also
means it runs entirely on Anthropic's side and could be wrapped as a scheduled deployment
later if you ever want recurring design reviews.

## Runbook

```powershell
cd C:\Users\mikef\api-designer
pip install -r requirements.txt
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# 1) Create the agent + environment
python provision.py          # -> save AGENT_ID, ENV_ID

# 2) Run a design task; deliverables download to .\outputs\
$env:AGENT_ID = "agent_..."
$env:ENV_ID   = "env_..."
python run_design.py "Design a REST + GraphQL API for a multi-tenant invoicing SaaS with OAuth2"
```

`run_design.py` appends an instruction to write deliverables under
`/mnt/session/outputs/`, then downloads them to `.\outputs\` after the session finishes.
