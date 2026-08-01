#!/usr/bin/env python3
"""
Create the vault holding MCP credentials for the Vercel Deploy Diagnoser, with one
credential per MCP server (Vercel, GitHub, Slack). Sessions and the scheduled deployment
reference this vault via vault_ids so the agent's MCP tools can authenticate. Anthropic
injects the token at egress — it never enters the sandbox.

YOU MUST SUPPLY THE TOKENS. Hosted MCP servers use OAuth, and how you obtain the
access/refresh tokens is specific to each server — consult each server's docs. Note
these are usually OAuth bearer tokens, NOT the service's native API keys. Set them as
env vars (below) or paste them into CREDENTIALS, then:

    pip install anthropic
    $env:ANTHROPIC_API_KEY      = "sk-ant-..."
    $env:VERCEL_MCP_TOKEN       = "..."
    $env:GITHUB_MCP_TOKEN       = "..."
    $env:SLACK_MCP_TOKEN        = "..."
    python setup_vault.py

Prints VAULT_ID for create_deployment.py / sessions.create.

This uses the documented `mcp_oauth` shape with just an access_token (no auto-refresh):
the token works until it expires, then the agent loses access. To enable auto-refresh,
add a "refresh" block (refresh_token + client_id + token_endpoint + token_endpoint_auth)
— see https://platform.claude.com/docs/en/managed-agents/vaults.md. If a server issues a
plain static bearer with no OAuth, swap auth to
{"type": "static_bearer", "mcp_server_url": ..., "token": ...} and confirm the field
names against that same doc.
"""
import os
import sys

import anthropic

VAULT_NAME = "vercel-deploy-diagnoser-vault"

# mcp_server_url MUST exactly match the URL declared on the agent (see provision.py).
CREDENTIALS = [
    {
        "display_name": "Vercel MCP",
        "auth": {
            "type": "mcp_oauth",
            "mcp_server_url": "https://mcp.vercel.com/mcp",
            "access_token": os.getenv("VERCEL_MCP_TOKEN", "TODO"),
        },
    },
    {
        "display_name": "GitHub MCP",
        "auth": {
            "type": "mcp_oauth",
            "mcp_server_url": "https://api.githubcopilot.com/mcp/",
            "access_token": os.getenv("GITHUB_MCP_TOKEN", "TODO"),
        },
    },
    {
        "display_name": "Slack MCP",
        "auth": {
            "type": "mcp_oauth",
            "mcp_server_url": "https://mcp.slack.com/mcp",
            "access_token": os.getenv("SLACK_MCP_TOKEN", "TODO"),
        },
    },
]


def find_by_name(page, name):
    return next((i for i in page if getattr(i, "name", None) == name), None)


def main():
    if not (os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")):
        sys.exit("ANTHROPIC_API_KEY is not set.")
    missing = [c["display_name"] for c in CREDENTIALS if c["auth"]["access_token"] == "TODO"]
    if missing:
        sys.exit("Supply tokens (env vars or edit CREDENTIALS) for: " + ", ".join(missing))

    client = anthropic.Anthropic()

    vault = find_by_name(client.beta.vaults.list(), VAULT_NAME)
    if vault is None:
        vault = client.beta.vaults.create(name=VAULT_NAME)
        print(f"Created vault {vault.id}")
    else:
        print(f"Reusing vault {vault.id}")

    for cred in CREDENTIALS:
        url = cred["auth"]["mcp_server_url"]
        try:
            client.beta.vaults.credentials.create(
                vault.id, display_name=cred["display_name"], auth=cred["auth"]
            )
            print(f"Added credential for {url}")
        except anthropic.APIStatusError as e:
            if getattr(e, "status_code", None) == 409:
                print(f"Credential for {url} already exists; skipping")
            else:
                raise

    print(f"\nVAULT_ID={vault.id}")


if __name__ == "__main__":
    main()
