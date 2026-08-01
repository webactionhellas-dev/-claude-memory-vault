// Orchestrator: loads config, starts the dashboard, then polls X + wallets forever.
import { loadEnv, loadConfig, loadState, saveState, log } from "./lib.js";
import { checkWallets } from "./wallets.js";
import { checkX } from "./x.js";
import { startStream } from "./stream.js";
import { startDashboard } from "./dashboard.js";
import { fireAlert } from "./alerts.js";

// A stray async rejection must never take down a 24/7 radar.
process.on("unhandledRejection", (e) => log("unhandledRejection:", e?.message || e));
process.on("uncaughtException", (e) => log("uncaughtException:", e?.message || e));

loadEnv();

let config;
try {
  config = loadConfig();
} catch (e) {
  log("FATAL:", e.message);
  process.exit(1);
}
const state = loadState();

const port = Number(process.env.DASHBOARD_PORT || 8787);
startDashboard(port);

const haveHelius = !!process.env.HELIUS_API_KEY;
const xProvider = config.xProvider || "official";
const haveX = xProvider === "twitterapi" ? !!process.env.TWITTERAPI_KEY : !!process.env.X_BEARER_TOKEN;
const haveTelegram = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
const haveNtfy = !!process.env.NTFY_TOPIC;
const streaming = haveHelius && config.stream !== false;

log("X Tracker starting (read-only radar).");
log(`  Helius (wallets): ${haveHelius ? "on" : "OFF (add HELIUS_API_KEY)"}`);
log(`  X (tweets):       ${haveX ? `on (${xProvider})` : `off (${xProvider}: add key)`}`);
log(`  ntfy push:        ${haveNtfy ? "on (topic set)" : "off"}`);
log(`  Telegram push:    ${haveTelegram ? "on" : "off"}`);
log(`  Poll interval:    ${config.pollSeconds}s`);
log(`  Wallets watched:  ${config.wallets?.length || 0}   X accounts: ${config.xAccounts?.length || 0}`);
log(`  Enrichment:       ${config.enrich === false ? "off" : "on (rug grade + market data)"}`);
log(`  Convergence:      ${config.convergence?.count || 2}+ wallets / ${config.convergence?.windowMinutes || 30}m`);
log(`  Live stream:      ${streaming ? "ON (websocket, ~1-2s)" : "off (REST poll only)"}`);

if (haveNtfy || haveTelegram) {
  await fireAlert({
    source: "system",
    kind: "startup",
    title: "X Tracker is live",
    body: `Watching ${config.wallets?.length || 0} wallet(s) and ${config.xAccounts?.length || 0} X account(s). This alerts you, it does not trade.`,
  });
}

if (streaming) startStream(config, state);

let running = false;
async function cycle() {
  if (running) return; // never overlap cycles
  running = true;
  let n = 0;
  try {
    if (haveX) {
      try { n += await checkX(config, state); }
      catch (e) { log("X module error:", e.message); }
    }
    if (haveHelius) {
      try { n += await checkWallets(config, state); }
      catch (e) { log("Wallet module error:", e.message); }
    }
  } finally {
    try { saveState(state); } catch (e) { log("saveState failed:", e.message); }
    running = false;
  }
  if (n) log(`Cycle done: ${n} new alert(s).`);
}

await cycle();
setInterval(cycle, Math.max(5, Number(config.pollSeconds || 20)) * 1000);
log("Running. Press Ctrl+C to stop.");
