const STATUS_LABEL = { ok: 'recovered', warn: 'degraded', down: 'DOWN' };

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegram(text) {
  if (!telegramConfigured()) return { sent: false, reason: 'not configured' };
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { sent: false, reason: `telegram HTTP ${res.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}

// Telegram parses this text as HTML (parse_mode: 'HTML' below) - a site name or error message
// containing a raw "<" or "&" would otherwise either break Telegram's entity parser (silently
// killing the alert) or, worse, get interpreted as markup. Escape anything that isn't one of
// our own literal <b> tags.
function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatTransitionAlert(result, transition) {
  const label = STATUS_LABEL[result.overall] || result.overall;
  const lines = [`<b>${escHtml(result.name)}</b> is now <b>${label}</b>`];
  lines.push(escHtml(result.url));
  if (result.overall !== 'ok') {
    if (result.error) lines.push(`error: ${escHtml(result.error)}`);
    else lines.push(`status ${result.status}, ${result.ms}ms`);
    if (result.brokenImages?.length) lines.push(`${result.brokenImages.length} broken image(s)`);
    if (result.missingHeaders?.length) lines.push(`missing headers: ${escHtml(result.missingHeaders.join(', '))}`);
  }
  return lines.join('\n');
}
