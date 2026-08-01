#!/usr/bin/env python3
"""
ONE-TIME SETUP — create the "API Designer" Managed Agent + its environment.

This one is the simple case: prebuilt toolset only (the agent writes OpenAPI specs,
Postman collections, and migration guides itself, server-side). No custom tools, no MCP
servers, no vault, no orchestrator.

    pip install anthropic
    $env:ANTHROPIC_API_KEY = "sk-ant-..."
    python provision.py
"""
import os
import sys

import anthropic

AGENT_NAME = "API Designer"
ENV_NAME = "api-designer-env"
MODEL = "claude-sonnet-4-6"

SYSTEM = """You are a senior API designer specializing in REST and GraphQL architectures. When given a task, analyze business domain models and client requirements, then design APIs following API-first principles: resource-oriented architecture, proper HTTP semantics, consistent naming, and comprehensive OpenAPI 3.1 specifications.

Cover authentication patterns (OAuth 2.0, JWT, API keys), versioning strategies (URI, header, content-type), pagination (cursor, page-based, limit/offset), webhooks, bulk operations, and error handling with consistent formats and actionable messages. Optimize for developer experience — generate request/response examples, error catalogs, and SDK guidance.

For GraphQL, address type system design, query complexity, mutation patterns, subscriptions, and federation. Always ensure backward compatibility, define deprecation policies, and include rate limiting and cache control headers. Deliver complete OpenAPI specs, Postman collections, and migration guides."""

TOOLS = [{"type": "agent_toolset_20260401"}]


def find_by_name(page, name):
    return next((i for i in page if getattr(i, "name", None) == name), None)


def main():
    if not (os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")):
        sys.exit("ANTHROPIC_API_KEY is not set.")

    client = anthropic.Anthropic()
    recreate = os.getenv("RECREATE") == "1"

    env = None if recreate else find_by_name(client.beta.environments.list(), ENV_NAME)
    if env is None:
        env = client.beta.environments.create(
            name=ENV_NAME,
            config={"type": "cloud", "networking": {"type": "unrestricted"}},
        )
        print(f"Created environment {env.id}")
    else:
        print(f"Reusing environment {env.id}")

    agent = None if recreate else find_by_name(client.beta.agents.list(), AGENT_NAME)
    if agent is None:
        agent = client.beta.agents.create(
            name=AGENT_NAME, model=MODEL, system=SYSTEM, tools=TOOLS
        )
        print(f"Created agent {agent.id} (version {agent.version})")
    else:
        print(f"Reusing existing agent {agent.id} (version {agent.version})")

    print("\n# Save these:")
    print(f"AGENT_ID={agent.id}")
    print(f"ENV_ID={env.id}")
    print("\nNext: run_design.py sends a design task and downloads the deliverables.")


if __name__ == "__main__":
    main()
