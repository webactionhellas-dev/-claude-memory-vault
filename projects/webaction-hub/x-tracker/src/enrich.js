// Enriches a token mint with a rug-safety grade (RugCheck) and live market data
// (Dexscreener). Both are free, no key. Fails SAFE: on error the risk band is
// "Unknown" and treated as risky, never as safe. Cached briefly per mint.
import { log } from "./lib.js";

const cache = new Map(); // mint -> { t, data }
const TTL = 3 * 60 * 1000;

async function getJson(url, opts = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), ...opts });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function rugCheck(mint) {
  try {
    const j = await getJson(`https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`, {
      headers: { Accept: "application/json" },
    });
    const risks = Array.isArray(j.risks) ? j.risks : [];
    const dangers = risks.filter((r) => r.level === "danger");
    const norm = Number(j.score_normalised ?? 0); // 0-100, higher = riskier
    let band;
    if (dangers.length >= 1 || norm >= 65) band = "Critical";
    else if (norm >= 40) band = "High";
    else if (norm >= 15) band = "Caution";
    else band = "Safe";
    const reasons = risks
      .slice()
      .sort((a, b) => (b.level === "danger") - (a.level === "danger") || (b.score || 0) - (a.score || 0))
      .slice(0, 3)
      .map((r) => r.name);
    return { band, normalised: norm, lpLockedPct: j.lpLockedPct ?? null, reasons };
  } catch (e) {
    return { band: "Unknown", normalised: null, reasons: ["no rug report yet - treat as risky"], error: e.message };
  }
}

async function dexData(mint) {
  try {
    const j = await getJson(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const pairs = Array.isArray(j.pairs) ? j.pairs : [];
    if (!pairs.length) return null;
    const p = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    const ageMin = p.pairCreatedAt ? Math.max(0, Math.round((new Date().getTime() - p.pairCreatedAt) / 60000)) : null;
    return {
      symbol: p.baseToken?.symbol || null,
      name: p.baseToken?.name || null,
      priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
      liquidityUsd: p.liquidity?.usd ?? null,
      fdv: p.fdv ?? null,
      ageMinutes: ageMin,
      dex: p.dexId || null,
    };
  } catch {
    return null;
  }
}

export async function enrich(mint) {
  const c = cache.get(mint);
  if (c && new Date().getTime() - c.t < TTL) return c.data;
  const [risk, market] = await Promise.all([rugCheck(mint), dexData(mint)]);
  const data = { risk, market };
  cache.set(mint, { t: new Date().getTime(), data });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return data;
}

export function riskEmoji(band) {
  return { Safe: "✅", Caution: "⚠️", High: "🛑", Critical: "☠️", Unknown: "❓" }[band] || "❓";
}
export function fmtUsd(n) {
  if (n == null) return "?";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "k";
  if (n >= 1) return "$" + n.toFixed(2);
  return "$" + Number(n).toPrecision(2);
}
export function fmtAge(m) {
  if (m == null) return "?";
  if (m < 60) return m + "m";
  if (m < 1440) return (m / 60).toFixed(1) + "h";
  return (m / 1440).toFixed(1) + "d";
}
