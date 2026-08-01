# Web Action Hub

Consolidated snapshot of active projects and Claude memory notes.

## Structure

- `claude-memory/` — persistent Claude Code memory notes (project context, standing decisions, traps to avoid)
- Everything else — one folder per project (site builds and internal tools), source only

## Notes

- `node_modules`, build output (`.next`, `dist`, `build`), and secret files (`.env*`, keys, credentials) were excluded on purpose — run each project's own install/build step locally, and pull real environment variables from their respective hosting dashboards (Vercel/Supabase/Shopify), not from this repo.
- Where a project had multiple saved versions on disk, only the latest/canonical one is included here.
