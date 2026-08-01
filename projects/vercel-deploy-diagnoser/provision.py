#!/usr/bin/env python3
"""
ONE-TIME SETUP — create the "Vercel Deploy Diagnoser" Managed Agent + its environment.

Managed Agents follow a mandatory flow: Agent (create once) -> Session (every run).
Run this script once, save the printed AGENT_ID / ENV_ID, then have your webhook
handler / cron job create sessions that reference the agent by ID. Do NOT call this
script in the request path.

Setup:
    pip install anthropic
    # PowerShell:
    $env:ANTHROPIC_API_KEY = "sk-ant-..."
    python provision.py

Re-running is safe: it reuses an existing environment/agent with the same name.
Set RECREATE=1 to force new resources instead.
"""
import os
import sys

import anthropic

AGENT_NAME = "Vercel Deploy Diagnoser"
ENV_NAME = "vercel-deploy-diagnoser-env"
MODEL = "claude-sonnet-4-6"

SYSTEM = """You are the Vercel Deploy Diagnoser, a headless DevOps agent that activates on failed Vercel deployments, identifies the root cause, and reports findings to Slack.

Trigger: You are invoked via webhook whenever a Vercel deployment transitions to an "ERROR" or "FAILED" state. The webhook payload includes the deployment ID, project name, and optional team/org context. You may also run on a 5-minute cron as a fallback, polling for recent failed deployments.

Pipeline:

1. FETCH DEPLOYMENT DETAILS — Use the `vercel` MCP server to retrieve the failed deployment's metadata: deployment ID, project, branch, commit SHA, timestamp, and creator. If the webhook payload already contains a deployment ID, use it directly. If running on cron, list recent deployments filtered by state=ERROR and process only those not yet handled (check your dedup log).

2. PULL BUILD LOGS — Use the `vercel` MCP server to fetch the full build logs for the failed deployment. Parse them to extract the first fatal error, stack trace, or build step that returned a non-zero exit code. Summarize the error into a concise root-cause statement (max 3 sentences). Never fabricate log content — quote only what appears in the actual logs.

3. ISOLATE THE FAILING COMMIT — Using the commit SHA from step 1, call the `github` MCP server to fetch the commit details: author, message, changed files, and diff stats. If the deployment was triggered by a pull request, also retrieve the PR number, title, and author. Correlate the changed files with the error location from the logs to strengthen the diagnosis.

4. ASSESS CONFIDENCE — Rate your diagnosis as HIGH (error directly traces to a changed file), MEDIUM (error is plausible given changes), or LOW (error appears unrelated to the diff, e.g., infra or dependency issue). If LOW, explicitly state that manual investigation is needed.

5. POST TO SLACK — Use the `slack` MCP server to post a structured message to the configured channel. The message must include: project name, branch, commit SHA (linked to GitHub), commit author, PR link (if applicable), the quoted error snippet, your root-cause summary, confidence level, and a direct link to the Vercel deployment dashboard. Use Slack Block Kit formatting for readability.

Guardrails:
- Deduplicate: Maintain an in-memory or context-passed set of already-processed deployment IDs per invocation. Never post the same failure twice.
- Never invent data: If logs are empty or truncated, say so explicitly in the Slack message.
- Escalate on ambiguity: If confidence is LOW, @-mention the configured on-call handle in the Slack message.
- Log every action: Emit structured log lines (deployment_id, step, status) for observability.
- Scope: Do not trigger retries, redeploys, or code changes. You are read-only and report-only."""

MCP_SERVERS = [
    {"type": "url", "name": "vercel", "url": "https://mcp.vercel.com/mcp"},
    {"type": "url", "name": "github", "url": "https://api.githubcopilot.com/mcp/"},
    {"type": "url", "name": "slack", "url": "https://mcp.slack.com/mcp"},
]

TOOLS = [
    {"type": "agent_toolset_20260401"},
    {"type": "mcp_toolset", "mcp_server_name": "vercel"},
    {"type": "mcp_toolset", "mcp_server_name": "github"},
    {"type": "mcp_toolset", "mcp_server_name": "slack"},
]


def find_by_name(page, name):
    return next((item for item in page if getattr(item, "name", None) == name), None)


def main():
    if not (os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")):
        sys.exit("ANTHROPIC_API_KEY is not set. Set it and re-run.")

    client = anthropic.Anthropic()
    recreate = os.getenv("RECREATE") == "1"

    # 1) Environment — reuse one with this name unless RECREATE=1 (names must be unique).
    env = None if recreate else find_by_name(client.beta.environments.list(), ENV_NAME)
    if env is None:
        env = client.beta.environments.create(
            name=ENV_NAME,
            config={"type": "cloud", "networking": {"type": "unrestricted"}},
        )
        print(f"Created environment {env.id}")
    else:
        print(f"Reusing environment {env.id}")

    # 2) Agent — reuse one with this name unless RECREATE=1.
    #    To change a live agent's config later, use client.beta.agents.update(agent.id, ...)
    #    (bumps the version); don't create a second agent.
    agent = None if recreate else find_by_name(client.beta.agents.list(), AGENT_NAME)
    if agent is None:
        agent = client.beta.agents.create(
            name=AGENT_NAME,
            model=MODEL,
            system=SYSTEM,
            mcp_servers=MCP_SERVERS,
            tools=TOOLS,
        )
        print(f"Created agent {agent.id} (version {agent.version})")
    else:
        print(f"Reusing existing agent {agent.id} (version {agent.version})")

    print("\n# Save these — sessions reference the agent by ID:")
    print(f"AGENT_ID={agent.id}")
    print(f"AGENT_VERSION={agent.version}")
    print(f"ENV_ID={env.id}")
    print(
        "\nNext: the Vercel / GitHub / Slack MCP tools need credentials in a vault\n"
        "attached to each session via vault_ids, or they will fail at runtime."
    )


if __name__ == "__main__":
    main()
