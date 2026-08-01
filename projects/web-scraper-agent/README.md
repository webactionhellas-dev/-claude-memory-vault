# Web Scraper Agent — Managed Agent

Extracts structured data from dynamic/SPA pages via Browser Use Cloud.

- **Model:** `claude-sonnet-4-6`
- **Tools:** prebuilt agent toolset + two **custom** tools — `browser_use_extract`,
  `submit_extraction`

## Why the pasted command would break

The system prompt tells the agent to call `browser_use_extract` and `submit_extraction`,
but the pasted `ant ... --tool '{type: agent_toolset_20260401}'` declares neither. Created
as-is, the agent is instructed to call tools that don't exist. `provision.py` here declares
both as `custom` tools with input schemas.

## Custom tools ⇒ you need a live orchestrator

Custom tools run in **your** code. When the agent calls one, the session goes idle until
your process answers with a `user.custom_tool_result`. So this agent only works while
`run_scrape.py` (or your own equivalent) is running and holding the event stream. It is
**not** a fire-and-forget scheduled deployment.

## Runbook

```powershell
cd C:\Users\mikef\web-scraper-agent
pip install -r requirements.txt
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# 1) Create the agent + environment
python provision.py            # -> save AGENT_ID, ENV_ID

# 2) Run a scrape (this process services the custom tools)
$env:AGENT_ID            = "agent_..."
$env:ENV_ID              = "env_..."
$env:BROWSER_USE_API_KEY = "..."        # your Browser Use Cloud key — stays host-side
python run_scrape.py "Extract product name and price from https://example.com/p/123"
```

## Browser Use integration is a TODO

`call_browser_use()` in `run_scrape.py` uses the common "submit task → poll" shape, but the
**exact endpoints/auth/response fields are placeholders** — verify them against the current
Browser Use Cloud docs (<https://docs.browser-use.com>). The Browser Use API key stays in
your orchestrator and is never placed in the agent's sandbox.

## If you want this to run unattended (like the Vercel agent)

Custom tools block on your client, so swap the design:

- Make Browser Use reachable from inside the sandbox via a vault **`environment_variable`**
  credential (`BROWSER_USE_API_KEY`, substituted at egress), and let the agent call the
  Browser Use API itself with the prebuilt `bash`/`web_fetch` tools.
- Replace `submit_extraction` with an instruction to write the final JSON to
  `/mnt/session/outputs/extraction.json`, which you download via the Files API after.

Then it can run as a scheduled **deployment** with no orchestrator. Ask and I'll build it.
