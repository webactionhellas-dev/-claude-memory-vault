---
name: prospecting-queue
description: "Queue of prospective-client sites for the on-demand prospect-scan task to audit and pitch. Add a row, then trigger prospect-scan manually from the Scheduled sidebar."
metadata: 
  node_type: memory
  type: reference
  originSessionId: 823366e5-4f94-4eca-952d-a3d51f637a05
  modified: 2026-08-03T19:04:35.570Z
---

Add a business name + their current website URL below whenever you want a real, scored pitch angle instead of a cold guess. Trigger the `prospect-scan` scheduled task manually (Scheduled sidebar -> Run now) after adding entries -- it's ad-hoc, it never runs on its own schedule, so nothing gets scanned or contacted without you explicitly choosing to.

## Queue (not yet scanned)

| Business | URL | Niche/notes | Added |
|---|---|---|---|

## Scanned (results in prospect-scan-results.md)

| Business | URL | Scanned | Score |
|---|---|---|---|
