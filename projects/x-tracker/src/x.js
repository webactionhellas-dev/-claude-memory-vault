// Watches X accounts for coin signals (Solana mints, pump.fun/dex links,
// keywords) in new tweets. Two providers, selected by config.xProvider:
//   - "official":   X API v2 recent-search        (needs X_BEARER_TOKEN, ~$200/mo)
//   - "twitterapi": twitterapi.io advanced-search  (needs TWITTERAPI_KEY, cheap)
// NOTE: the twitterapi.io adapter is written to their public docs but is marked
// UNVERIFIED until a real key is present - it is validated live on first run.
import {
  loadEnv, loadConfig, loadState, saveState, tokenLinks, log, isMain, recentlySeen,
} from "./lib.js";
import { enrich } from "./enrich.js";
import { fireAlert } from "./alerts.js";

const SEARCH = "https://api.x.com/2/tweets/search/recent";
const TWITTERAPI = "https://api.twitterapi.io/twitter/tweet/advanced_search";
const SOL_MINT = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

export async function checkX(config, state) {
  const provider = config.xProvider || "official";
  if (provider === "twitterapi") return checkXTwitterApi(config, state);
  return checkXOfficial(config, state);
}

// ---- shared helpers ----
function buildQueries(accounts) {
  const queries = [];
  let group = [];
  const flush = () => {
    if (group.length) {
      queries.push(`(${group.map((a) => `from:${a}`).join(" OR ")}) -is:retweet -is:reply`);
      group = [];
    }
  };
  for (const a of accounts) {
    group.push(a.replace(/^@/, "").trim());
    if (group.map((x) => x.length + 8).reduce((s, n) => s + n, 0) > 380) flush();
  }
  flush();
  return queries;
}

function detectSignals(text, entities, filters) {
  const mints = new Set();
  const links = [];
  const urls = (entities?.urls || []).map((u) => u.expanded_url || u.url || "");
  const haystack = [text, ...urls].join(" ");
  if (filters.detectSolanaMints) {
    for (const m of haystack.match(SOL_MINT) || []) if (m.length >= 32 && m.length <= 44) mints.add(m);
  }
  for (const u of urls) {
    if (filters.detectPumpFunLinks && /pump\.fun/i.test(u)) links.push(u);
    if (filters.detectDexLinks && /(dexscreener\.com|birdeye\.so)/i.test(u)) links.push(u);
    for (const m of u.match(SOL_MINT) || []) if (m.length >= 32) mints.add(m);
  }
  const kw = (filters.keywords || []).filter((k) => new RegExp(escapeRe(k), "i").test(text));
  return { mints: [...mints], links, keywords: kw };
}

// Turn one tweet into alerts. Shared by both providers.
async function emitTweet(handle, text, entities, tweetId, config, state) {
  const filters = config.filters || {};
  const axiomPattern = config.axiomPattern;
  const sig = detectSignals(text, entities, filters);
  const hasSignal = sig.mints.length || sig.links.length || sig.keywords.length;
  if (filters.onlyAlertTweetsWithSignal && !hasSignal) return 0;
  const url = `https://x.com/${handle}/status/${tweetId}`;
  let n = 0;
  if (sig.mints.length) {
    for (const mint of sig.mints) {
      if (recentlySeen(state, `x:${handle}:${mint}`, config.dedupeMinutes)) continue;
      const info = config.enrich === false ? {} : await enrich(mint);
      const sym = info.market?.symbol ? `$${info.market.symbol}` : "a token";
      await fireAlert({
        source: "x", kind: "tweet-mint",
        title: `@${handle} posted ${sym}`, body: trim(text),
        mint, links: tokenLinks(mint, axiomPattern), url, risk: info.risk, market: info.market,
      });
      n++;
    }
  } else {
    if (recentlySeen(state, `x:${handle}:${tweetId}`, config.dedupeMinutes)) return n;
    await fireAlert({
      source: "x", kind: "tweet-signal",
      title: `@${handle}: possible coin signal`,
      body: trim(text) + (sig.links.length ? `\n${sig.links[0]}` : ""), url,
    });
    n++;
  }
  return n;
}

// ---- official X API v2 recent search ----
async function checkXOfficial(config, state) {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) { log("X_BEARER_TOKEN missing, skipping X module."); return 0; }
  const accounts = (config.xAccounts || []).filter(Boolean);
  if (!accounts.length) return 0;
  const headers = { Authorization: `Bearer ${token}` };
  let alerts = 0;

  for (const q of buildQueries(accounts)) {
    try {
      const since = state.xSince[q];
      const params = new URLSearchParams({
        query: q, max_results: "20",
        "tweet.fields": "created_at,entities,author_id",
        expansions: "author_id", "user.fields": "username",
      });
      if (since) params.set("since_id", since);
      const res = await fetch(`${SEARCH}?${params}`, { headers });
      if (res.status === 429) { log("X rate limited (429). Skipping chunk this cycle."); continue; }
      if (!res.ok) { log(`X ${res.status}:`, (await res.text().catch(() => "")).slice(0, 200)); continue; }
      const json = await res.json();
      const tweets = json.data || [];
      const users = Object.fromEntries((json.includes?.users || []).map((u) => [u.id, u.username]));
      let chunkMax = since || null;
      for (const tw of tweets) {
        chunkMax = maxId(chunkMax, tw.id);
        if (!since) continue; // bootstrap
        const handle = users[tw.author_id] || tw.author_id;
        alerts += await emitTweet(handle, tw.text, tw.entities, tw.id, config, state);
      }
      if (chunkMax) state.xSince[q] = chunkMax;
    } catch (e) { log("X chunk errored, continuing:", e.message); }
  }
  return alerts;
}

// ---- twitterapi.io advanced search (cheap third-party) - UNVERIFIED until keyed ----
async function checkXTwitterApi(config, state) {
  const key = process.env.TWITTERAPI_KEY;
  if (!key) { log("TWITTERAPI_KEY missing, skipping X module."); return 0; }
  const accounts = (config.xAccounts || []).filter(Boolean);
  if (!accounts.length) return 0;
  const headers = { "X-API-Key": key };
  let alerts = 0;

  for (const q of buildQueries(accounts)) {
    try {
      const url = `${TWITTERAPI}?queryType=Latest&query=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
      if (!res.ok) { log(`twitterapi ${res.status}:`, (await res.text().catch(() => "")).slice(0, 200)); continue; }
      const json = await res.json();
      const tweets = json.tweets || json.data || [];
      const sinceKey = `tw:${q}`;
      const since = state.xSince[sinceKey];
      let chunkMax = since || null;
      for (const tw of tweets) {
        const id = String(tw.id || tw.id_str || "");
        if (!id) continue;
        chunkMax = maxId(chunkMax, id);
        if (!since) continue; // bootstrap
        if (!isNewer(id, since)) continue;
        const handle = tw.author?.userName || tw.author?.screen_name || tw.username || "?";
        const text = tw.text || tw.full_text || "";
        const entities = { urls: (tw.entities?.urls || []).map((u) => ({ expanded_url: u.expanded_url || u.url })) };
        alerts += await emitTweet(handle, text, entities, id, config, state);
      }
      if (chunkMax) state.xSince[sinceKey] = chunkMax;
    } catch (e) { log("twitterapi chunk errored, continuing:", e.message); }
  }
  return alerts;
}

function maxId(a, b) {
  if (a == null) return b;
  if (b == null) return a;
  if (/^[0-9]+$/.test(a) && /^[0-9]+$/.test(b)) return BigInt(b) > BigInt(a) ? b : a;
  return b;
}
function isNewer(id, since) {
  if (/^[0-9]+$/.test(id) && /^[0-9]+$/.test(since)) return BigInt(id) > BigInt(since);
  return id > since;
}
function trim(s) { return String(s).replace(/\s+/g, " ").slice(0, 240); }
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// Standalone: `node src/x.js`
if (isMain(import.meta.url)) {
  loadEnv();
  const config = loadConfig();
  const state = loadState();
  const n = await checkX(config, state);
  saveState(state);
  log(`X check done. ${n} new alert(s).`);
}
