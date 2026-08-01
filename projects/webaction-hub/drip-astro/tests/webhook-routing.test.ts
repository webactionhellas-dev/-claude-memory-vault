// Unit tests for the webhook routing gate + expired-session cleanup
// (src/lib/fulfillment.ts). Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionForEvent, cleanupExpiredOrder, type CleanupStore } from '../src/lib/fulfillment.ts';

/* --- item 1: the payment_status gate --- */

test('completed + paid fulfils', () => {
  assert.equal(actionForEvent('checkout.session.completed', { payment_status: 'paid' }), 'fulfil');
});

test('completed + no_payment_required (100% promo code) also fulfils', () => {
  assert.equal(
    actionForEvent('checkout.session.completed', { payment_status: 'no_payment_required' }),
    'fulfil',
  );
});

test('completed + unpaid (async payment method) WAITS, never fulfils', () => {
  assert.equal(actionForEvent('checkout.session.completed', { payment_status: 'unpaid' }), 'wait');
  assert.equal(actionForEvent('checkout.session.completed', {}), 'wait');
  assert.equal(actionForEvent('checkout.session.completed', null), 'wait');
});

test('async_payment_succeeded fulfils; async_payment_failed cancels', () => {
  assert.equal(actionForEvent('checkout.session.async_payment_succeeded', { payment_status: 'paid' }), 'fulfil');
  assert.equal(actionForEvent('checkout.session.async_payment_failed', { payment_status: 'unpaid' }), 'fail');
});

test('expired cleans up; unknown events are ignored', () => {
  assert.equal(actionForEvent('checkout.session.expired', { payment_status: 'unpaid' }), 'cleanup');
  assert.equal(actionForEvent('payment_intent.succeeded', { payment_status: 'paid' }), 'ignore');
  assert.equal(actionForEvent('charge.refunded', {}), 'ignore'); // handled separately, not via this gate
});

/* --- item 5: expired cleanup idempotency --- */

function makeCleanupStore(initialStatus: string) {
  let status = initialStatus;
  let deletes = 0;
  const store: CleanupStore = {
    async deletePendingOrder() {
      // models DELETE ... WHERE status='pending' RETURNING id
      if (status !== 'pending') return false;
      status = 'deleted';
      deletes++;
      return true;
    },
  };
  return { store, deletes: () => deletes, status: () => status };
}

test('expired cleanup deletes a pending order exactly once (idempotent)', async () => {
  const s = makeCleanupStore('pending');
  const first = await cleanupExpiredOrder(s.store, 'order_1');
  const retry = await cleanupExpiredOrder(s.store, 'order_1');
  assert.equal(first.deleted, true);
  assert.equal(retry.deleted, false); // second delivery is a no-op
  assert.equal(s.deletes(), 1);
});

test('expired cleanup never touches a PAID order', async () => {
  const s = makeCleanupStore('paid');
  const r = await cleanupExpiredOrder(s.store, 'order_2');
  assert.equal(r.deleted, false);
  assert.equal(s.status(), 'paid'); // untouched
});
