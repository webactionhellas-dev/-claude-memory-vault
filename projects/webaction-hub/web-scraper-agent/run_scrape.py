#!/usr/bin/env python3
"""
Orchestrator / runner for the Web Scraper Agent. Creates a session, sends a scrape
request, streams events, and SERVICES THE CUSTOM TOOLS:
  - browser_use_extract -> calls Browser Use Cloud (host-side; API key never enters the sandbox)
  - submit_extraction   -> captures the final structured payload

This process must be running for the agent to work — custom-tool calls block the session
until it answers with a user.custom_tool_result.

    pip install anthropic
    $env:ANTHROPIC_API_KEY    = "sk-ant-..."
    $env:AGENT_ID             = "agent_..."
    $env:ENV_ID               = "env_..."
    $env:BROWSER_USE_API_KEY  = "..."        # your Browser Use Cloud key (stays host-side)
    python run_scrape.py "Scrape the product name and price from https://example.com/p/123"
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

import anthropic

# --- Browser Use Cloud integration -------------------------------------------------
# VERIFY these against the current Browser Use Cloud API docs (https://docs.browser-use.com).
# The shape below is the common "submit task -> poll for result" pattern. Adjust the
# base URL, paths, auth header, and response fields to match their live API.
BROWSER_USE_BASE = os.getenv("BROWSER_USE_BASE", "https://api.browser-use.com/api/v1")
POLL_TIMEOUT_S = 180
POLL_INTERVAL_S = 3


def _http(method, path, payload=None):
    key = os.environ["BROWSER_USE_API_KEY"]
    req = urllib.request.Request(
        f"{BROWSER_USE_BASE}{path}",
        method=method,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def call_browser_use(url, extraction_goal, output_schema=None):
    """Run a Browser Use Cloud task and return the extracted result as a JSON string."""
    if not os.getenv("BROWSER_USE_API_KEY"):
        return json.dumps({
            "error": "BROWSER_USE_API_KEY not set; cannot reach Browser Use Cloud.",
            "url": url,
        })
    task = (
        f"Go to {url}. {extraction_goal}. "
        "Return the result strictly as a JSON array of objects; use null for missing fields."
    )
    if output_schema:
        task += f" Conform each object to this JSON schema: {json.dumps(output_schema)}."

    try:
        created = _http("POST", "/run-task", {"task": task})          # TODO: verify path/body
        task_id = created.get("id") or created.get("task_id")
        deadline = time.time() + POLL_TIMEOUT_S
        while time.time() < deadline:
            status = _http("GET", f"/task/{task_id}")                  # TODO: verify path
            state = status.get("status") or status.get("state")
            if state in ("finished", "completed", "success"):
                return json.dumps(status.get("output") or status.get("result") or status)
            if state in ("failed", "stopped", "error"):
                return json.dumps({"error": f"Browser Use task {state}", "detail": status})
            time.sleep(POLL_INTERVAL_S)
        return json.dumps({"error": "Browser Use task timed out", "task_id": task_id})
    except urllib.error.HTTPError as e:
        return json.dumps({"error": f"Browser Use HTTP {e.code}", "body": e.read().decode()})
    except Exception as e:  # noqa: BLE001 - report any failure back to the agent
        return json.dumps({"error": f"Browser Use call failed: {e}"})


# --- Session loop ------------------------------------------------------------------
def main():
    if not (os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")):
        sys.exit("ANTHROPIC_API_KEY is not set.")
    agent_id, env_id = os.getenv("AGENT_ID"), os.getenv("ENV_ID")
    if not (agent_id and env_id):
        sys.exit("Set AGENT_ID and ENV_ID (from provision.py output).")
    prompt = " ".join(sys.argv[1:]).strip()
    if not prompt:
        sys.exit('Usage: python run_scrape.py "<scrape request>"')

    client = anthropic.Anthropic()
    session = client.beta.sessions.create(agent=agent_id, environment_id=env_id)
    print(f"Session {session.id}\n")

    final_payload = None

    # Stream-first: open the stream, then send the kickoff so no early events are missed.
    with client.beta.sessions.events.stream(session_id=session.id) as stream:
        client.beta.sessions.events.send(
            session_id=session.id,
            events=[{"type": "user.message", "content": [{"type": "text", "text": prompt}]}],
        )
        for event in stream:
            if event.type == "agent.message":
                for block in event.content:
                    if block.type == "text":
                        print(block.text, end="", flush=True)

            elif event.type == "agent.custom_tool_use":
                if event.name == "browser_use_extract":
                    result = call_browser_use(
                        event.input["url"],
                        event.input["extraction_goal"],
                        event.input.get("output_schema"),
                    )
                elif event.name == "submit_extraction":
                    final_payload = event.input
                    result = "received"
                else:
                    result = json.dumps({"error": f"unknown tool {event.name}"})
                client.beta.sessions.events.send(
                    session_id=session.id,
                    events=[{
                        "type": "user.custom_tool_result",
                        "custom_tool_use_id": event.id,
                        "content": [{"type": "text", "text": result}],
                    }],
                )

            elif event.type == "session.status_idle":
                if getattr(getattr(event, "stop_reason", None), "type", None) == "requires_action":
                    continue  # waiting on a tool result we just sent (or are sending)
                break
            elif event.type == "session.status_terminated":
                break

    print("\n\n=== Final extraction ===")
    print(json.dumps(final_payload, indent=2) if final_payload else "(submit_extraction was never called)")


if __name__ == "__main__":
    main()
