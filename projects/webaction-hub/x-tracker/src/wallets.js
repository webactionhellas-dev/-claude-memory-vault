// REST poll of Solana wallets via Helius. Acts as the reliable backfill layer
// (the websocket stream in stream.js is the fast path). Both share the dedupe
// state, so a buy caught by the stream is not re-alerted by the poll.
import { loadEnv, loadConfig, loadState, saveState, log, isMain } from "./lib.js";
import { processWalletTx } from "./detect.js";

const HELIUS = "https://api.helius.xyz/v0";

async function fetchTxs(address, key) {
  const url = `${HELIUS}/addresses/${address}/transactions?api-key=${key}&limit=20`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      log(`Helius ${res.status} for ${address}:`, (await res.text().catch(() => "")).slice(0, 160));
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    log(`Helius fetch failed for ${address}:`, e.message);
    return [];
  }
}

export async function checkWallets(config, state) {
  const key = process.env.HELIUS_API_KEY;
  if (!key) { log("HELIUS_API_KEY missing, skipping wallet module."); return 0; }

  let alerts = 0;
  for (const w of config.wallets || []) {
    try {
      const address = (w.address || "").trim();
      if (!address || address.startsWith("REPLACE_")) continue;

      const txs = await fetchTxs(address, key);
      if (!txs.length) continue;

      const ws = state.wallets[address] || { seen: [], bootstrapped: false };
      const seen = new Set(ws.seen);

      // First sighting: record history without alerting on the past.
      if (!ws.bootstrapped) {
        state.wallets[address] = { seen: txs.map((t) => t.signature).slice(0, 100), bootstrapped: true };
        log(`Bootstrapped wallet ${w.label || address} (${txs.length} recent txs, no alerts on history).`);
        continue;
      }

      for (const tx of [...txs].reverse()) {
        if (seen.has(tx.signature)) continue;
        seen.add(tx.signature);
        alerts += await processWalletTx(tx, { label: w.label, address }, config, state);
      }

      state.wallets[address] = { seen: [...seen].slice(-100), bootstrapped: true };
    } catch (e) {
      log(`Wallet ${w.label || w.address} errored, continuing:`, e.message);
    }
  }
  return alerts;
}

// Allow running standalone: `node src/wallets.js`
if (isMain(import.meta.url)) {
  loadEnv();
  const config = loadConfig();
  const state = loadState();
  const n = await checkWallets(config, state);
  saveState(state);
  log(`Wallet check done. ${n} new alert(s).`);
}
