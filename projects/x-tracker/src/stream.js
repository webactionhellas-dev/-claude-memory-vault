// Real-time wallet feed via Helius websocket (logsSubscribe). Pushes a buy to
// you in ~1-2s instead of the 20s REST poll. Free on the standard Helius key.
// The REST poll (wallets.js) stays on as a backfill; shared dedupe prevents
// double alerts. Zero-dependency: uses Node's built-in global WebSocket.
import { log, saveState } from "./lib.js";
import { processWalletTx } from "./detect.js";

const WS_URL = (key) => `wss://mainnet.helius-rpc.com/?api-key=${key}`;
const PARSE_URL = (key) => `https://api.helius.xyz/v0/transactions?api-key=${key}`;

export function startStream(config, state) {
  const key = process.env.HELIUS_API_KEY;
  if (!key) return null;
  const wallets = (config.wallets || [])
    .map((w) => ({ label: w.label, address: (w.address || "").trim() }))
    .filter((w) => w.address && !w.address.startsWith("REPLACE_"));
  if (!wallets.length) return null;

  let ws;
  let backoff = 1000;
  let closedByUs = false;
  const subToWallet = new Map(); // subscription id -> wallet
  const recentSig = new Set(); // short-term signature dedupe

  function connect() {
    ws = new WebSocket(WS_URL(key));

    ws.onopen = () => {
      backoff = 1000;
      subToWallet.clear();
      wallets.forEach((w, i) => {
        ws.send(JSON.stringify({
          jsonrpc: "2.0", id: 1000 + i, method: "logsSubscribe",
          params: [{ mentions: [w.address] }, { commitment: "confirmed" }],
        }));
      });
      log(`Live stream connected: watching ${wallets.length} wallets in real time.`);
    };

    ws.onmessage = async (ev) => {
      let msg;
      try { msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString()); } catch { return; }
      // subscription confirmation: { result: <subId>, id }
      if (typeof msg.result === "number" && typeof msg.id === "number" && msg.id >= 1000) {
        const w = wallets[msg.id - 1000];
        if (w) subToWallet.set(msg.result, w);
        return;
      }
      if (msg.method !== "logsNotification") return;
      const w = subToWallet.get(msg.params?.subscription);
      const val = msg.params?.result?.value;
      if (!w || !val || val.err) return; // skip failed txs
      const sig = val.signature;
      if (!sig || recentSig.has(sig)) return;
      recentSig.add(sig);
      if (recentSig.size > 4000) recentSig.clear();
      try {
        const n = await handleSig(sig, w, config, state, key);
        if (n) saveState(state);
      } catch (e) {
        log("stream handleSig error:", e.message);
      }
    };

    ws.onerror = (e) => log("Stream error:", e?.message || "ws error");
    ws.onclose = () => {
      if (closedByUs) return;
      log(`Live stream dropped, reconnecting in ${Math.round(backoff / 1000)}s...`);
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 30000);
    };
  }

  connect();
  return { stop() { closedByUs = true; try { ws?.close(); } catch {} } };
}

async function fetchParsed(sig, key) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(PARSE_URL(key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: [sig] }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const arr = await res.json();
        if (Array.isArray(arr) && arr[0]) return arr[0];
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 800)); // tx may not be parsed yet
  }
  return null;
}

async function handleSig(sig, w, config, state, key) {
  const tx = await fetchParsed(sig, key);
  if (!tx) return 0;
  // mark the signature so the REST backfill does not re-alert the same tx
  const ws = state.wallets[w.address];
  if (ws?.seen && !ws.seen.includes(sig)) {
    ws.seen.push(sig);
    ws.seen = ws.seen.slice(-100);
  }
  return processWalletTx(tx, w, config, state);
}
