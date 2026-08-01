// Unit tests for the "not configured" fallback predicates (src/lib/ready.ts).
// Run with: npm test
//
// These decide whether checkout answers a friendly 503 ("add your Stripe and
// Supabase keys") or proceeds. They are exactly what keeps the rest of the site
// working while the client's LIVE Stripe keys are still pending: with the .env
// placeholders in place, isStripeSecret() is false, so /api/checkout returns 503
// and every other page is unaffected.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStripeSecret, isServiceRoleKey, isResendKey } from '../src/lib/ready.ts';

test('Resend key: real keys ready, placeholder/empty not', () => {
  assert.equal(isResendKey('re_123abc456def'), true);
  assert.equal(isResendKey('__SET_ME__resend'), false);
  assert.equal(isResendKey(''), false);
  assert.equal(isResendKey(undefined), false);
});

test('Stripe key: placeholder and empty are NOT ready', () => {
  assert.equal(isStripeSecret('__SET_ME__stripe_sk'), false);
  assert.equal(isStripeSecret(''), false);
  assert.equal(isStripeSecret(undefined), false);
  assert.equal(isStripeSecret(null), false);
});

test('Stripe key: real test and live keys ARE ready', () => {
  assert.equal(isStripeSecret('sk_test_51abcDEF...'), true);
  assert.equal(isStripeSecret('sk_live_51abcDEF...'), true);
});

test('Stripe key: a publishable key is NOT a secret key', () => {
  assert.equal(isStripeSecret('pk_test_51abcDEF...'), false);
});

test('Service-role key: placeholder and short strings are NOT ready', () => {
  assert.equal(isServiceRoleKey('__SET_ME__'), false);
  assert.equal(isServiceRoleKey('short'), false);
  assert.equal(isServiceRoleKey(''), false);
  assert.equal(isServiceRoleKey(undefined), false);
  // A placeholder padded past 40 chars must still be rejected by the prefix guard.
  assert.equal(isServiceRoleKey('__SET_ME__' + 'x'.repeat(40)), false);
});

test('Service-role key: a real-length secret key IS ready', () => {
  // Modern Supabase secret key (sb_secret_...) and legacy JWT both exceed 40 chars.
  assert.equal(isServiceRoleKey('sb_secret_' + 'a'.repeat(35)), true);
  assert.equal(isServiceRoleKey('eyJ' + 'a'.repeat(120)), true);
});
