// Sends an alert to every configured channel: console, dashboard log, ntfy, Telegram.
import { appendAlert, log } from "./lib.js";
import { fmtUsd, fmtAge, riskEmoji } from "./enrich.js";

// Compact "insight" lines shared by every channel: live market + rug grade.
function insightLines(alert) {
  const out = [];
  const m = alert.market;
  if (m) {
    out.push(
      `${m.symbol ? m.symbol + "  " : ""}px ${fmtUsd(m.priceUsd)} · liq ${fmtUsd(m.liquidityUsd)} · age ${fmtAge(m.ageMinutes)}${m.dex ? " · " + m.dex : ""}`
    );
  }
  const r = alert.risk;
  if (r) out.push(`risk ${riskEmoji(r.band)} ${r.band}${r.reasons?.length ? ": " + r.reasons.join(", ") : ""}`);
  return out;
}

const SOURCE_TAG = { convergence: "rotating_light", wallet: "money_with_wings", x: "bird", system: "satellite" };
const BAND_TAG = { Critical: "skull", High: "octagonal_sign", Caution: "warning", Safe: "white_check_mark", Unknown: "question" };

// ntfy.sh: free phone push with NO account. Subscribe to the topic in the ntfy app.
async function sendNtfy(alert) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  const server = process.env.NTFY_SERVER || "https://ntfy.sh";
  try {
    const headers = { Title: asciiHeader(alert.title || "X Tracker") };
    const tags = [SOURCE_TAG[alert.source] || "satellite"];
    const bt = BAND_TAG[alert.risk?.band];
    if (bt) tags.push(bt);
    headers.Tags = tags.join(",");
    headers.Priority = alert.source === "convergence" ? "5" : "3";
    if (alert.links?.dexscreener) headers.Click = alert.links.dexscreener;
    const actions = [];
    if (alert.links?.axiom) actions.push(`view, Axiom, ${alert.links.axiom}`);
    if (alert.links?.dexscreener) actions.push(`view, Dexscreener, ${alert.links.dexscreener}`);
    if (alert.links?.gmgn) actions.push(`view, GMGN, ${alert.links.gmgn}`);
    if (actions.length) headers.Actions = actions.slice(0, 3).join("; ");
    const lines = [alert.body || "", ...insightLines(alert)];
    if (alert.mint) lines.push(alert.mint);
    const res = await fetch(`${server}/${topic}`, { method: "POST", headers, body: lines.filter(Boolean).join("\n") });
    if (!res.ok) log("ntfy send failed:", res.status);
  } catch (e) {
    log("ntfy error:", e.message);
  }
}
// HTTP headers must be ASCII: strip anything else (emoji live in Tags, not Title).
function asciiHeader(s) {
  return String(s).replace(/[^\x20-\x7E]/g, "").slice(0, 200);
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // silently skip if not configured
  if (text.length > 4096) text = text.slice(0, 4080) + "\n..."; // Telegram hard limit
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: false }),
    });
    if (!res.ok) log("Telegram send failed:", res.status, await res.text());
  } catch (e) {
    log("Telegram error:", e.message);
  }
}

// alert = { source, kind, title, body, mint?, links?, url?, risk?, market? }
export async function fireAlert(alert) {
  const record = { time: new Date().toISOString(), ...alert };
  appendAlert(record);

  const linkLines = [];
  if (alert.url) linkLines.push(`Source: ${alert.url}`);
  if (alert.links?.axiom) linkLines.push(`Axiom: ${alert.links.axiom}`);
  if (alert.links?.dexscreener) linkLines.push(`Dexscreener: ${alert.links.dexscreener}`);
  if (alert.links?.gmgn) linkLines.push(`GMGN: ${alert.links.gmgn}`);
  const insights = insightLines(alert);

  const text =
    `<b>${escapeHtml(alert.title)}</b>\n` +
    `${escapeHtml(alert.body || "")}\n` +
    (insights.length ? insights.map(escapeHtml).join("\n") + "\n" : "") +
    (alert.mint ? `\n<code>${alert.mint}</code>\n` : "") +
    (linkLines.length ? `\n${linkLines.map(escapeHtml).join("\n")}` : "");

  log(`ALERT [${alert.source}] ${alert.title} ${alert.mint ? "(" + alert.mint + ")" : ""}`);
  await Promise.all([sendTelegram(text), sendNtfy(alert)]);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
