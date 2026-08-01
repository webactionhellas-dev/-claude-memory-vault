// Tracks which watched wallets bought the same mint inside a rolling window.
// In-memory (resets on restart, which is fine for a short window). Returns the
// list of distinct wallets currently converging on a mint.
const hits = new Map(); // mint -> Map(walletLabel -> lastBuyTime)

export function recordBuy(mint, wallet, windowMinutes) {
  const now = new Date().getTime();
  let m = hits.get(mint);
  if (!m) { m = new Map(); hits.set(mint, m); }
  m.set(wallet, now);
  const cutoff = now - (windowMinutes || 30) * 60000;
  for (const [w, t] of m) if (t < cutoff) m.delete(w);
  if (m.size === 0) { hits.delete(mint); return []; }
  return [...m.keys()];
}
