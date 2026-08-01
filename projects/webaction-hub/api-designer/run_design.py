#!/usr/bin/env python3
"""
Send a design task to the API Designer agent, stream its response, and download whatever
it wrote to /mnt/session/outputs/ (OpenAPI spec, Postman collection, migration guide, ...).

    pip install anthropic
    $env:ANTHROPIC_API_KEY = "sk-ant-..."
    $env:AGENT_ID = "agent_..."
    $env:ENV_ID   = "env_..."
    python run_design.py "Design a REST + GraphQL API for a multi-tenant invoicing SaaS"
"""
import os
import sys
import time

import anthropic

OUTPUT_DIR = "outputs"
MA_BETA = "managed-agents-2026-04-01"


def main():
    if not (os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")):
        sys.exit("ANTHROPIC_API_KEY is not set.")
    agent_id, env_id = os.getenv("AGENT_ID"), os.getenv("ENV_ID")
    if not (agent_id and env_id):
        sys.exit("Set AGENT_ID and ENV_ID (from provision.py output).")
    task = " ".join(sys.argv[1:]).strip()
    if not task:
        sys.exit('Usage: python run_design.py "<design task>"')

    kickoff = (
        task
        + "\n\nSave every deliverable (OpenAPI 3.1 spec, Postman collection, migration "
        "guide, error catalog) as a file under /mnt/session/outputs/."
    )

    client = anthropic.Anthropic()
    session = client.beta.sessions.create(agent=agent_id, environment_id=env_id)
    print(f"Session {session.id}")
    print(f"Watch live: https://platform.claude.com/workspaces/default/sessions/{session.id}\n")

    # Stream-first: open the stream, then send the kickoff.
    with client.beta.sessions.events.stream(session_id=session.id) as stream:
        client.beta.sessions.events.send(
            session_id=session.id,
            events=[{"type": "user.message", "content": [{"type": "text", "text": kickoff}]}],
        )
        for event in stream:
            if event.type == "agent.message":
                for block in event.content:
                    if block.type == "text":
                        print(block.text, end="", flush=True)
            elif event.type == "session.status_idle":
                if getattr(getattr(event, "stop_reason", None), "type", None) == "requires_action":
                    continue
                break
            elif event.type == "session.status_terminated":
                break

    # Download session outputs (brief indexing lag after idle — retry a couple times).
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    files = []
    for _ in range(3):
        files = list(client.beta.files.list(scope_id=session.id, betas=[MA_BETA]))
        if files:
            break
        time.sleep(2)

    print("\n\n=== Deliverables ===")
    if not files:
        print("(no files were written to /mnt/session/outputs/)")
        return
    for f in files:
        safe = os.path.basename(f.filename)
        if not safe or safe in (".", ".."):
            print(f"Skipping suspicious filename: {f.filename}")
            continue
        path = os.path.join(OUTPUT_DIR, safe)
        client.beta.files.download(f.id).write_to_file(path)
        print(f"Saved {path} ({f.size_bytes} bytes)")


if __name__ == "__main__":
    main()
