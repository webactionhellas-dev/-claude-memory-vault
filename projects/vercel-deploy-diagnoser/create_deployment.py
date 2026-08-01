#!/usr/bin/env python3
"""
Create the scheduled deployment that runs the Vercel Deploy Diagnoser automatically
every 5 minutes (the cron fallback from the spec). Each firing creates a session that
scans for failed deploys and reports new ones to Slack. Runs entirely on Anthropic's
infrastructure — nothing to host.

Run once, after provision.py. Needs the AGENT_ID / ENV_ID it printed:

    pip install anthropic
    $env:ANTHROPIC_API_KEY = "sk-ant-..."
    $env:AGENT_ID = "agent_..."
    $env:ENV_ID   = "env_..."
    $env:VAULT_ID = "vlt_..."     # from setup_vault.py — required for the MCP tools to auth
    python create_deployment.py
"""
import os
import sys

import anthropic

DEPLOYMENT_NAME = "Vercel Deploy Diagnoser - 5-min scan"
MEMORY_STORE_NAME = "vdd-dedup"
CRON = "*/5 * * * *"   # every 5 minutes
TIMEZONE = "UTC"       # UTC sidesteps DST skip/duplicate edges (irrelevant at 5-min cadence, but clean)

KICKOFF = (
    "Scheduled run. Scan for recent Vercel deployments currently in an ERROR or FAILED "
    "state and run your pipeline for each one not already recorded in your dedup log. "
    "If there are no new failures, do nothing and end the run."
)

# Cross-run dedup: a stateless cron would otherwise re-post the same failure every 5 min.
DEDUP_INSTRUCTIONS = (
    "This is your persistent dedup log across scheduled runs. Before reporting a failed "
    "deployment, read processed_deployments.md here and skip any deployment_id already "
    "listed. After successfully posting to Slack, append the deployment_id and an "
    "ISO-8601 timestamp to that file. Create the file if it does not exist."
)


def find_by_name(page, name):
    return next((i for i in page if getattr(i, "name", None) == name), None)


def main():
    if not (os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")):
        sys.exit("ANTHROPIC_API_KEY is not set.")
    agent_id = os.getenv("AGENT_ID")
    env_id = os.getenv("ENV_ID")
    if not (agent_id and env_id):
        sys.exit("Set AGENT_ID and ENV_ID (from provision.py output).")

    client = anthropic.Anthropic()
    if not hasattr(client.beta, "deployments"):
        sys.exit(
            "Your anthropic SDK is too old for scheduled deployments. Upgrade:\n"
            "    pip install -U anthropic\n"
            "or create it via raw HTTP: POST /v1/deployments with the beta header "
            "'managed-agents-2026-04-01'."
        )

    # Persistent memory store backing the dedup log.
    store = find_by_name(client.beta.memory_stores.list(), MEMORY_STORE_NAME)
    if store is None:
        store = client.beta.memory_stores.create(
            name=MEMORY_STORE_NAME,
            description="Deployment IDs the Vercel Deploy Diagnoser has already reported.",
        )
        print(f"Created memory store {store.id}")
    else:
        print(f"Reusing memory store {store.id}")

    kwargs = dict(
        name=DEPLOYMENT_NAME,
        agent=agent_id,
        environment_id=env_id,
        resources=[{
            "type": "memory_store",
            "memory_store_id": store.id,
            "access": "read_write",
            "instructions": DEDUP_INSTRUCTIONS,
        }],
        initial_events=[{
            "type": "user.message",
            "content": [{"type": "text", "text": KICKOFF}],
        }],
        schedule={"type": "cron", "expression": CRON, "timezone": TIMEZONE},
    )

    vault_id = os.getenv("VAULT_ID")
    if vault_id:
        kwargs["vault_ids"] = [vault_id]
    else:
        print(
            "WARNING: VAULT_ID not set. The deployment will be created, but the "
            "Vercel/GitHub/Slack MCP tools will fail to authenticate at runtime. "
            "Run setup_vault.py first, then re-run this with VAULT_ID set."
        )

    deployment = client.beta.deployments.create(**kwargs)
    print(f"\nCreated deployment {deployment.id}")
    upcoming = getattr(getattr(deployment, "schedule", None), "upcoming_runs_at", None)
    if upcoming:
        print("Next scheduled runs:", ", ".join(upcoming[:3]))

    print(
        "\n# Manage it from the SDK:\n"
        f"client.beta.deployments.run('{deployment.id}')      # fire one run now, to test\n"
        f"client.beta.deployments.pause('{deployment.id}')    # stop the schedule (reversible)\n"
        f"client.beta.deployments.unpause('{deployment.id}')  # resume\n"
        "# Audit fired runs (each carries a session_id or an error):\n"
        f"client.beta.deployment_runs.list(deployment_id='{deployment.id}')"
    )


if __name__ == "__main__":
    main()
