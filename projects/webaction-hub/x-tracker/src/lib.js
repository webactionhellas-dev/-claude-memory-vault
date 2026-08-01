// Shared helpers: zero-dependency env loader, config + state persistence, links.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data");

// True when the given import.meta.url is the entrypoint (`node src/x.js`).
// Compares resolved paths so it works with Windows' file:///C:/ URLs.
export function isMain(metaUrl) {
  return !!process.argv[1] && fileURLToPath(metaUrl) === process.argv[1];
}

// --- tiny .env loader (no dotenv dependency) ---
export function loadEnv() {
  const path = join(ROOT, ".env");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

// Throws a clear error the caller can catch instead of a raw JSON stack.
export function loadConfig() {
  const path = join(ROOT, "config.json");
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`Could not read config.json (${e.message}). Fix the file and restart.`);
  }
}

// --- state (last-seen markers, dedupe) persisted to data/state.json ---
function ensureData() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}
function freshState() {
  return { wallets: {}, xSince: {}, seen: {} };
}
export function loadState() {
  ensureData();
  const path = join(DATA_DIR, "state.json");
  const bak = path + ".bak";
  for (const p of [path, bak]) {
    if (!existsSync(p)) continue;
    try {
      const s = JSON.parse(readFileSync(p, "utf8"));
      // normalise shape so callers can rely on the keys existing
      s.wallets ||= {};
      s.xSince ||= {};
      s.seen ||= {};
      return s;
    } catch {
      log(`state file ${p} unreadable, trying fallback.`);
    }
  }
  return freshState();
}
// Atomic write (temp + rename) with a .bak rotation, and prune stale dedupe keys
// so state.json cannot grow without bound over days of running.
export function saveState(state) {
  ensureData();
  const path = join(DATA_DIR, "state.json");
  const cutoff = new Date().getTime() - 24 * 60 * 60 * 1000;
  for (const k in state.seen) if (state.seen[k] < cutoff) delete state.seen[k];
  if (existsSync(path)) { try { copyFileSync(path, path + ".bak"); } catch {} }
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, path);
}

// --- alert log for the dashboard (data/alerts.json, newest first, capped) ---
export function appendAlert(alert) {
  ensureData();
  const path = join(DATA_DIR, "alerts.json");
  let list = [];
  if (existsSync(path)) {
    try { list = JSON.parse(readFileSync(path, "utf8")); } catch { list = []; }
  }
  list.unshift(alert);
  if (list.length > 500) list = list.slice(0, 500);
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(list, null, 2));
  renameSync(tmp, path);
}
export function readAlerts() {
  const path = join(DATA_DIR, "alerts.json");
  if (!existsSync(path)) return [];
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return []; }
}

export function log(...args) {
  const t = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${t}]`, ...args);
}

// Shared dedupe: true if this key fired within `minutes` (wall-clock), else records now.
export function recentlySeen(state, key, minutes) {
  const now = new Date().getTime();
  const last = state.seen[key];
  if (last && now - last < (minutes || 30) * 60000) return true;
  state.seen[key] = now;
  return false;
}

// --- link builders so an alert is one tap from acting ---
// Only mint-direct links that the research CONFIRMED are included by default.
// Axiom has no documented deeplink; axiomPattern is overridable in config.json
// ("axiomPattern": "https://axiom.trade/t/{mint}") and is flagged unverified.
export function tokenLinks(mint, axiomPattern) {
  const links = {
    dexscreener: `https://dexscreener.com/solana/${mint}`,
    gmgn: `https://gmgn.ai/sol/token/${mint}`,
    bullx: `https://neo.bullx.io/terminal?chainId=1399811149&address=${mint}`,
    birdeye: `https://birdeye.so/token/${mint}?chain=solana`,
  };
  if (axiomPattern) links.axiom = axiomPattern.replace("{mint}", mint);
  return links;
}
export function walletLink(address) {
  return `https://solscan.io/account/${address}`;
}

// Known non-target mints we should NOT treat as a "new coin bought".
export const IGNORE_MINTS = new Set([
  "So11111111111111111111111111111111111111112", // wrapped SOL
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
]);
