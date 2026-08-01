// Unit tests for the Resend sender (src/lib/email.ts) with an injected fetch.
// Run with: npm test
//
// The property that matters: email is BEST-EFFORT. Without a key it skips with
// no network call; with a key it POSTs to Resend with the Bearer header; any
// API/network failure is swallowed (returns { ok:false }, never throws) so the
// Stripe webhook can always return 200. Under node:test the module reads
// process.env (import.meta.env fallback), so each test sets the env explicitly.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { sendEmail, emailReady, emailFrom, ownerNotifyEmail } from '../src/lib/email.ts';

const MSG = { to: 'buyer@example.gr', subject: 'Test', html: '<p>hi</p>', text: 'hi' };

beforeEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.OWNER_NOTIFY_EMAIL;
});

test('without RESEND_API_KEY: skips gracefully, makes NO network call', async () => {
  let called = 0;
  const spy = (async () => { called++; return new Response('{}'); }) as typeof fetch;
  assert.equal(emailReady(), false);
  const r = await sendEmail(MSG, spy);
  assert.deepEqual(r, { ok: false, skipped: true });
  assert.equal(called, 0);
});

test('placeholder key (not re_...) still counts as not configured', async () => {
  process.env.RESEND_API_KEY = '__SET_ME__resend_key';
  assert.equal(emailReady(), false);
  const r = await sendEmail(MSG, (async () => new Response('{}')) as typeof fetch);
  assert.equal(r.skipped, true);
});

test('with a key: POSTs to Resend with Bearer auth and the right payload', async () => {
  process.env.RESEND_API_KEY = 're_test_1234567890';
  process.env.EMAIL_FROM = 'DRIP <orders@drip.example>';
  let captured: { url: string; init: RequestInit } | null = null;
  const spy = (async (url: any, init: any) => {
    captured = { url: String(url), init };
    return new Response('{"id":"email_1"}', { status: 200 });
  }) as typeof fetch;

  const r = await sendEmail(MSG, spy);
  assert.equal(r.ok, true);
  assert.equal(captured!.url, 'https://api.resend.com/emails');
  const headers = captured!.init.headers as Record<string, string>;
  assert.equal(headers.authorization, 'Bearer re_test_1234567890');
  const body = JSON.parse(String(captured!.init.body));
  assert.equal(body.from, 'DRIP <orders@drip.example>');
  assert.deepEqual(body.to, ['buyer@example.gr']);
  assert.equal(body.subject, 'Test');
  assert.equal(body.text, 'hi');
});

test('EMAIL_FROM defaults to the Resend test sender when unset', () => {
  assert.equal(emailFrom(), 'DRIP <onboarding@resend.dev>');
  assert.equal(ownerNotifyEmail(), ''); // owner notification off by default
});

test('a Resend API error is swallowed: { ok:false }, never a throw', async () => {
  process.env.RESEND_API_KEY = 're_test_1234567890';
  const spy = (async () => new Response('{"message":"invalid"}', { status: 422 })) as typeof fetch;
  const r = await sendEmail(MSG, spy);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'resend_422');
});

test('a network failure is swallowed too', async () => {
  process.env.RESEND_API_KEY = 're_test_1234567890';
  const spy = (async () => { throw new Error('ECONNREFUSED'); }) as typeof fetch;
  const r = await sendEmail(MSG, spy);
  assert.deepEqual(r, { ok: false, error: 'network' });
});
