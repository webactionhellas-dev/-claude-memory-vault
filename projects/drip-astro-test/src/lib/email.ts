// Lean Resend sender: one POST to https://api.resend.com/emails with a Bearer
// key, no SDK. Server-only (the API key must never reach a client island).
//
// Failure philosophy: transactional email is best-effort. sendEmail NEVER
// throws; when the key is missing it skips with a single log line, and any
// network/API failure is logged and swallowed so the Stripe webhook always
// returns 200 (a retried webhook would be a no-op anyway: fulfilment is
// idempotent and the email block only runs on the first delivery).
//
// Env is read lazily through import.meta.env with a process.env fallback so the
// same module works under Astro/Vite AND under plain node:test (which injects a
// mock fetch; see tests/email.test.ts).
// Explicit .ts extension so the module also loads under plain node:test
// (Node strips types but does not resolve extensionless imports); Vite/Astro
// resolves it identically.
import { isResendKey } from './ready.ts';

const env = (): Record<string, string | undefined> =>
  ((import.meta as any).env ?? process.env) as Record<string, string | undefined>;

/** True once a real Resend key is configured. */
export const emailReady = (): boolean => isResendKey(env().RESEND_API_KEY);

/** Sender identity. Resend's test address works before the client DNS is set up. */
export const emailFrom = (): string => env().EMAIL_FROM || 'DRIP <onboarding@resend.dev>';

/** Optional merchant address for new-order notifications (empty = off). */
export const ownerNotifyEmail = (): string => env().OWNER_NOTIFY_EMAIL || '';

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail(
  msg: OutgoingEmail,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  if (!emailReady()) {
    console.log('[email] RESEND_API_KEY not set, skipping:', msg.subject);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env().RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom(),
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[email] Resend rejected the send:', res.status, detail.slice(0, 300));
      return { ok: false, error: `resend_${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('[email] send failed:', e?.message ?? e);
    return { ok: false, error: 'network' };
  }
}
