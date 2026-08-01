// Foreground Astro dev server for the Claude Code preview harness.
//
// Why this exists: Astro 7's `astro dev` CLI auto-detaches into a background
// daemon whenever it detects an agent environment (via the `am-i-vibing`
// package). A detached daemon makes the launched foreground process exit
// immediately, so the preview tool believes the server died and reports a
// failure. The programmatic dev() API runs the server in THIS process
// (foreground) and never touches that CLI-only daemon logic, so the preview
// harness can start and monitor it normally.
//
// The project root is derived from this file's own location (not process.cwd())
// so it works no matter which directory the preview harness launches it from.
import { dev } from 'astro';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 5188;

await dev({
  root,
  server: { port },
});
