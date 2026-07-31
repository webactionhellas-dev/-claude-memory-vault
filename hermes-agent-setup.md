---
name: hermes-agent-setup
description: "Hermes Agent (nousresearch/hermes-agent) install + working config on this Windows PC, and the setup gotchas"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7c59126d-c48e-4cac-b7ba-7a8de297d62d
---

Hermes Agent is installed and **working** as of 2026-06-26 at `%LOCALAPPDATA%\hermes` (i.e. `C:\Users\mikef\AppData\Local\hermes`). CLI: `hermes` (new terminal, on PATH) or full path `C:\Users\mikef\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes.exe`. Config: `~/.hermes/config.yaml`; secrets: `~/.hermes/.env`.

**Working config:** provider `gemini`, model `gemini-2.5-flash-lite` (Google AI Studio **free tier**), `GEMINI_API_KEY` in `.env`. Free — no billing. Model history: `gemini-3-flash-preview` 503'd (preview throttled) → `gemini-2.5-flash` worked but its small free **daily quota** (HTTP 429) got exhausted fast (the agent makes several model calls per message, esp. with search) → **`gemini-2.5-flash-lite`** (biggest free limits). KEY INSIGHT: Gemini free quota is **per-model**, so when one 429s, a *different* model has a fresh bucket — `gemini-2.5-flash-lite`, `gemini-flash-latest`, `gemini-flash-lite-latest` were all live. Resilience: chain them via top-level `fallback_model:` (list of `{provider, model}` dicts; needs a gateway restart). Deeper fixes for unlimited: Groq free key (high limits/fast, configured as custom OpenAI endpoint), ~$5 OpenRouter/Gemini credit, or local model post-[[hardware upgrade]].

**Gateway durability gotcha:** the Telegram gateway (`hermes gateway run`) is just a process — if its window/process closes or the PC reboots/sleeps, the bot goes silent (this happened 2026-06-26). Launched it via `Start-Process` in a visible PowerShell window titled "Hermes Gateway" so it survives the Claude Code session. **Permanent fix = Windows Task Scheduler auto-start on login (not yet set up).**

**Gotchas (cost hours; apply directly):**
- The template `config.yaml` ships `model.base_url: https://openrouter.ai/api/v1`. This is **ignored for the native `anthropic` provider but HIJACKS other providers** (gemini went to OpenRouter → HTTP 401). Fix: `hermes config set model.base_url https://generativelanguage.googleapis.com/v1beta/openai` for gemini (or set the matching endpoint per provider).
- Native providers need **bare model ids, no vendor prefix**: `claude-opus-4.6` (not `anthropic/claude-opus-4.6`), `gemini-3-flash-preview`. `hermes doctor` flags the prefix mismatch.
- **Claude is blocked without extra billing:** `hermes auth add anthropic --type oauth` logs in fine with a Claude Pro/Max subscription (manual code-paste flow), but Anthropic returns HTTP 400 "Third-party apps now draw from your extra usage, not your plan limits" — needs credit at claude.ai/settings/usage. So Claude-in-Hermes is not free.
- Setup commands are non-interactive: `hermes config set <key> <val>`, `hermes auth status <provider>`, `hermes doctor`, `hermes chat -q "..."` (prints real errors; `-z` swallows them).

**Hardware (no good local-model option *yet*):** Ryzen 5 3600, 16GB RAM, Radeon RX 570 4GB — the RX 570 can't accelerate LLMs via Ollama on Windows, so local would be CPU-only/low-quality. Use cloud free tiers for now. **User plans a full PC upgrade** and wants to unlock **local/private AI** with Hermes then: local LLMs via vLLM/llama.cpp (free/unlimited engine for Telegram + client bots), ComfyUI+FLUX+SAM for an eshop product-image pipeline (auto cutouts replacing manual prep.py), big parallel swarms, brand fine-tuning, and running the desktop as a 24/7 server. Advise **NVIDIA GPU + max VRAM** (16GB ok, 24GB+ great), 32–64GB RAM, NVMe. Revisit local-AI setup when the upgrade lands.

**Telegram connected (2026-06-26):** bot `@mikefalcos_hermes_bot`, locked to user id `5510711609` (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALLOWED_USERS` in `.env`; `python-telegram-bot[webhooks]==22.6` installed into the venv via uv). The gateway runs with `hermes gateway run` — Windows has **no service auto-start** (`gateway install/start` are systemd/launchd only), so it must be kept running for the bot to be live. `hermes send --to telegram:<id> "msg"` pushes a message with no agent/gateway needed.

**Claude Code ↔ Hermes bridge:** `hermes` is an MCP server in `~/.claude.json` mcpServers (`command: <venv>\hermes.exe`, `args: ["mcp","serve"]`) — exposes a messaging bridge (channels_list/conversations_list/messages_send). Reading is live, but `messages_send` needs the MCP server (re)started AFTER creds are in `.env` (env loads at spawn) — so set tokens before reopening Claude Code, or use `hermes send` in the meantime. The earlier restart preserved the mcpServers entry (no clobber).

**Web access:** `ddgs` (DuckDuckGo) installed into the venv → `web_search` works; `web_extract` is search-only (no free extract backend — agent falls back to the browser tool). **Scraping Google/Maps is blocked by bot-detection** — for structured local-business data use an API, not scraping. **Computer-use NOT enabled:** `hermes computer-use install` did not complete (needs `irm .../cua-driver/.../install.ps1 | iex` with `-ExecutionPolicy Bypass`, which the harness blocks); it left a dangling `cua-driver-serve` autostart + partial files in `%LOCALAPPDATA%\Programs\Cua` (offered to clean up).

**Custom skill built — `local-leads`** (`%LOCALAPPDATA%\hermes\skills\business\local-leads\`): `find_leads.py` finds local businesses with **no website** (sales leads for the user's web-design/eshop work) via free **OpenStreetMap/Overpass** (Nominatim geocode → Overpass with mirror-fallback → filter out website tags). No key; uses stdlib `urllib`; forces UTF-8 stdout (Greek names). Coverage is **partial** (only mapped businesses); for complete + star-rated data, a **Google Places** key is the upgrade. Use via Telegram: "find <type> without a website in <city>".

Hermes is a separate program from Claude Code. Setup files/scratch are under `C:\Users\mikef\hermes-inspect`. Related: [[managed-agents-provisioning]].
