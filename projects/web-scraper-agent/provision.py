#!/usr/bin/env python3
"""
ONE-TIME SETUP — create the "Web Scraper Agent" Managed Agent + its environment.

Unlike the pasted spec, this declares the two CUSTOM tools the system prompt actually
relies on: browser_use_extract and submit_extraction. Your orchestrator (run_scrape.py)
executes them — the agent only emits the calls.

    pip install anthropic
    $env:ANTHROPIC_API_KEY = "sk-ant-..."
    python provision.py
"""
import os
import sys

import anthropic

AGENT_NAME = "Web Scraper Agent"
ENV_NAME = "web-scraper-agent-env"
MODEL = "claude-sonnet-4-6"

SYSTEM = """You are a web scraping agent that extracts structured data from websites using Browser Use Cloud.

For every scraping request:
1. Infer the target URL and extraction goal from the user message.
2. Call browser_use_extract first to fetch the page content.
3. Call submit_extraction exactly once with the final normalized payload.
4. Keep prose responses concise — the structured tool result is the source of truth.

Rules:
- Use Browser Use for dynamic/SPA pages; do not rely on simple fetch-only logic.
- Never invent values. If a field is unavailable, use null.
- Return data as an array of objects.
- If blocked by login, captcha, or anti-bot flow, explain clearly in the notes field."""

TOOLS = [
    # Prebuilt toolset (bash/read/write/edit/glob/grep/web_fetch/web_search). Kept per the
    # spec. If you want to force every page through Browser Use, disable the fetch tools:
    #   {"type": "agent_toolset_20260401",
    #    "default_config": {"enabled": True},
    #    "configs": [{"name": "web_fetch", "enabled": False},
    #                {"name": "web_search", "enabled": False}]}
    {"type": "agent_toolset_20260401"},
    {
        "type": "custom",
        "name": "browser_use_extract",
        "description": (
            "Fetch and extract content from a web page using Browser Use Cloud "
            "(a real cloud browser — handles dynamic/SPA pages, JS rendering). "
            "Call this before submit_extraction."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "The page to scrape."},
                "extraction_goal": {
                    "type": "string",
                    "description": "Plain-language description of what to extract.",
                },
                "output_schema": {
                    "type": "object",
                    "description": "Optional JSON schema for the desired record shape.",
                },
            },
            "required": ["url", "extraction_goal"],
        },
    },
    {
        "type": "custom",
        "name": "submit_extraction",
        "description": (
            "Submit the final normalized extraction result. Call exactly once, last. "
            "data is an array of objects; use null for missing fields; put any blocker "
            "(login/captcha/anti-bot) explanation in notes."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "data": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Array of extracted records.",
                },
                "notes": {
                    "type": "string",
                    "description": "Blockers or caveats; empty string if none.",
                },
            },
            "required": ["data"],
        },
    },
]


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
    print("\nNext: run_scrape.py services the custom tools and drives a scrape.")


if __name__ == "__main__":
    main()
