// Interactive setup wizard. Run:  node setup.mjs
// Validates each credential with a live API call, auto-captures your Telegram
// chat id, and writes .env for you. Press Enter to skip any key.
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const rl = createInterface({ input, output });
const ask = (q) => rl.question(q);
const C = { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" };
const ok = (s) => console.log(`${C.g}  ok ${C.x}${s}`);
const bad = (s) => console.log(`${C.r}  x  ${C.x}${s}`);
const skip = () => console.log(`${C.d}  skipped${C.x}`);

console.log(`\n${C.b}X Tracker setup${C.x}`);
console.log(`Each key is validated with a live call, then .env is written.`);
console.log(`Press Enter to skip a key (that module just stays off).\n`);

const env = {};

// --- Helius (free, wallet tracking) ---
{
  const key = (await ask(`${C.b}Helius API key${C.x} ${C.d}(free at dashboard.helius.dev)${C.x}: `)).trim();
  if (!key) skip();
  else {
    try {
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.result) { ok("Helius key works. Wallet tracking enabled."); env.HELIUS_API_KEY = key; }
      else bad(`Helius rejected the key (HTTP ${res.status}). Left disabled.`);
    } catch (e) { bad(`Could not reach Helius: ${e.message}`); }
  }
}

// --- Telegram (free, phone push) ---
{
  const token = (await ask(`\n${C.b}Telegram bot token${C.x} ${C.d}(from @BotFather)${C.x}: `)).trim();
  if (!token) skip();
  else {
    try {
      const me = await (await fetch(`https://api.telegram.org/bot${token}/getMe`)).json();
      if (!me.ok) bad("Telegram rejected the token. Left disabled.");
      else {
        ok(`Bot @${me.result.username} verified.`);
        console.log(`${C.y}  Now open Telegram, message @${me.result.username} anything (e.g. "hi").${C.x}`);
        await ask("  Press Enter once you've sent it...");
        const upd = await (await fetch(`https://api.telegram.org/bot${token}/getUpdates`)).json();
        const msgs = (upd.result || []).filter((u) => u.message?.chat?.id);
        const chatId = msgs.length ? msgs[msgs.length - 1].message.chat.id : null;
        if (!chatId) bad("No message found. Send the bot a message and re-run setup. Telegram left disabled.");
        else {
          env.TELEGRAM_BOT_TOKEN = token;
          env.TELEGRAM_CHAT_ID = String(chatId);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: "X Tracker connected. Alerts will arrive here." }),
          });
          ok(`Chat id ${chatId} captured. Sent a test message, check Telegram.`);
        }
      }
    } catch (e) { bad(`Telegram error: ${e.message}`); }
  }
}

// --- X / Twitter (paid, optional) ---
{
  const tok = (await ask(`\n${C.b}X API bearer token${C.x} ${C.d}(paid; Enter to skip for now)${C.x}: `)).trim();
  if (!tok) skip();
  else {
    try {
      const res = await fetch("https://api.x.com/2/tweets/search/recent?query=crypto&max_results=10", {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) { ok("X token works. Tweet tracking enabled."); env.X_BEARER_TOKEN = tok; }
      else if (res.status === 429) { ok("X token valid (rate-limited right now). Enabled."); env.X_BEARER_TOKEN = tok; }
      else bad(`X rejected the token (HTTP ${res.status}). Left disabled.`);
    } catch (e) { bad(`X error: ${e.message}`); }
  }
}

// --- write .env ---
const lines = [
  "# Written by setup.mjs",
  `HELIUS_API_KEY=${env.HELIUS_API_KEY || ""}`,
  `X_BEARER_TOKEN=${env.X_BEARER_TOKEN || ""}`,
  `TELEGRAM_BOT_TOKEN=${env.TELEGRAM_BOT_TOKEN || ""}`,
  `TELEGRAM_CHAT_ID=${env.TELEGRAM_CHAT_ID || ""}`,
  `DASHBOARD_PORT=8787`,
  "",
];
writeFileSync(join(ROOT, ".env"), lines.join("\n"));

const on = [env.HELIUS_API_KEY && "wallets", env.X_BEARER_TOKEN && "X", env.TELEGRAM_BOT_TOKEN && "telegram"].filter(Boolean);
console.log(`\n${C.g}${C.b}Wrote .env${C.x}`);
console.log(`Enabled: ${on.join(", ") || "none yet"}`);
console.log(`\nNext:\n  1. Edit config.json (wallets + X handles) - I'm seeding a starter list for you\n  2. npm start\n  3. Open http://localhost:8787\n`);
rl.close();
