import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

export const ROOT = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));

// A packaged build's ROOT resolves to .../resources/app.asar - a single-file virtual archive,
// read-only at runtime. Any fs.writeFileSync/mkdirSync targeting a path "inside" it throws
// ENOTDIR (confirmed live: every recheck failed to save with exactly that error). Writable
// state has nowhere to go but a real directory, so it lands right next to app.asar instead.
// In dev/CLI mode ROOT is already a real folder, so this is a no-op and behaviour is unchanged.
export const WRITABLE_ROOT = path.basename(ROOT) === 'app.asar' ? path.dirname(ROOT) : ROOT;

export function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

// Reads the live writable copy once one exists; a fresh packaged install has none yet, so the
// first read falls back to the bundled seed copy shipped inside app.asar (real default sites).
// The very first save (add/remove/mute a site) creates the writable copy and it wins from then on.
export function loadConfig() {
  const writable = path.join(WRITABLE_ROOT, 'config.json');
  const source = fs.existsSync(writable) ? writable : path.join(ROOT, 'config.json');
  return JSON.parse(fs.readFileSync(source, 'utf8'));
}

export function saveConfig(config) {
  fs.mkdirSync(WRITABLE_ROOT, { recursive: true });
  fs.writeFileSync(path.join(WRITABLE_ROOT, 'config.json'), JSON.stringify(config, null, 2));
}

export async function fetchWithTiming(target, opts = {}) {
  const start = Date.now();
  try {
    const res = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(opts.timeoutMs || 10000), ...opts });
    return { ok: res.ok, status: res.status, headers: res.headers, ms: Date.now() - start, res };
  } catch (e) {
    return { ok: false, status: 0, headers: null, ms: Date.now() - start, error: e.message };
  }
}
