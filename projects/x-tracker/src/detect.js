// Shared buy-detection + alert pipeline, used by BOTH the REST poll (wallets.js)
// and the live websocket stream (stream.js). Keeping it here means both paths
// dedupe, enrich, and fire convergence identically.
import { fireAlert } from "./alerts.js";
import { tokenLinks, walletLink, recentlySeen, IGNORE_MINTS } from "./lib.js";
import { enrich } from "./enrich.js";
import { recordBuy } from "./convergence.js";

// A real BUY = the wallet's OWN balance changed: received a non-stable mint AND
// paid (its SOL or a stablecoin went down). Ownership is read from
// accountData.tokenBalanceChanges (userAccount), NOT the fee payer, so trades
// routed through Axiom/Photon/bot signers are still caught. Drops airdrops.
export function tokensBought(tx, address) {
  let solChange = 0;
  let paidStable = false;
  const received = new Map(); // mint -> human amount
  for (const ad of tx.accountData || []) {
    if (ad.account === address) solChange += ad.nativeBalanceChange || 0;
    for (const c of ad.tokenBalanceChanges || []) {
      if (c.userAccount !== address) continue;
      const raw = c.rawTokenAmount || {};
      const amt = Number(raw.tokenAmount || 0);
      if (IGNORE_MINTS.has(c.mint)) {
        if (amt < 0) paidStable = true;
      } else if (amt > 0) {
        received.set(c.mint, amt / Math.pow(10, Number(raw.decimals || 0)));
      }
    }
  }
  const paid = solChange < -1e5 || paidStable;
  if (!paid) return [];
  return [...received].map(([mint, amount]) => ({ mint, amount }));
}

// Process one enriched tx for one wallet: dedupe, enrich, alert, convergence.
export async function processWalletTx(tx, wallet, config, state) {
  const address = wallet.address;
  const label = wallet.label || short(address);
  const axiomPattern = config.axiomPattern;
  let alerts = 0;

  for (const buy of tokensBought(tx, address)) {
    const dedupeKey = `wallet:${address}:${buy.mint}`;
    if (recentlySeen(state, dedupeKey, config.dedupeMinutes)) continue;

    const info = config.enrich === false ? {} : await enrich(buy.mint);
    const sym = info.market?.symbol ? `$${info.market.symbol}` : "a token";

    await fireAlert({
      source: "wallet",
      kind: "buy",
      title: `${label} bought ${sym}`,
      body: `${label} received ${fmtAmt(buy.amount)} ${sym} in a ${tx.type || "tx"}.`,
      mint: buy.mint,
      links: tokenLinks(buy.mint, axiomPattern),
      url: walletLink(address),
      risk: info.risk,
      market: info.market,
    });
    alerts++;

    const conv = config.convergence || {};
    const walletsIn = recordBuy(buy.mint, label, conv.windowMinutes || 30);
    if (walletsIn.length >= (conv.count || 2)) {
      const ck = `convergence:${buy.mint}:${walletsIn.length}`;
      if (!recentlySeen(state, ck, conv.windowMinutes || 30)) {
        await fireAlert({
          source: "convergence",
          kind: "convergence",
          title: `CONVERGENCE: ${walletsIn.length} wallets bought ${sym}`,
          body: `${walletsIn.join(", ")} all bought ${sym} within ${conv.windowMinutes || 30}m.`,
          mint: buy.mint,
          links: tokenLinks(buy.mint, axiomPattern),
          risk: info.risk,
          market: info.market,
        });
        alerts++;
      }
    }
  }
  return alerts;
}

export function short(a) { return a.slice(0, 4) + ".." + a.slice(-4); }
function fmtAmt(n) {
  if (n == null) return "?";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(Math.round(n * 100) / 100);
}
