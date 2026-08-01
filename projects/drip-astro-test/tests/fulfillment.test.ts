// Money-path unit tests for the paid-order webhook idempotency seam
// (src/lib/fulfillment.ts). Run with: npm test
//
// The property under test: Stripe retries `checkout.session.completed`, and the
// inventory decrement is NOT reversible, so stock must be drawn down at most once
// per order however many times the event is delivered. We drive the REAL
// orchestration (fulfilPaidOrder) against an in-memory store that models the
// atomic `UPDATE ... WHERE status <> 'paid'` guard the webhook uses in Postgres.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fulfilPaidOrder, type FulfilmentStore, type OrderLine } from '../src/lib/fulfillment.ts';

/** In-memory store: markPaidOnce returns true exactly once (like the DB guard),
 *  and decrement clamps at 0 (like the decrement_inventory RPC). */
function makeStore(lines: OrderLine[]) {
  const stock: Record<string, number> = {};
  for (const l of lines) stock[`${l.product_slug}:${l.size}`] = 5;
  let paid = false;
  const decrementCalls: OrderLine[] = [];
  const store: FulfilmentStore = {
    async markPaidOnce() {
      if (paid) return false; // retry: the conditional update flips 0 rows
      paid = true;
      return true;
    },
    async getLines() {
      return lines;
    },
    async decrement(line) {
      decrementCalls.push(line);
      const key = `${line.product_slug}:${line.size}`;
      stock[key] = Math.max(0, (stock[key] ?? 0) - line.quantity); // greatest(0, ...)
    },
  };
  return { store, stock, decrementCalls };
}

const LINES: OrderLine[] = [
  { product_slug: 'air-jordan-1-chicago', size: '43', quantity: 1 },
  { product_slug: 'samba-og', size: '42', quantity: 2 },
];

test('first delivery fulfils the order and decrements every line once', async () => {
  const { store, stock, decrementCalls } = makeStore(LINES);
  const r = await fulfilPaidOrder(store, 'order_1');
  assert.equal(r.fulfilled, true);
  assert.equal(r.linesDecremented, 2);
  assert.equal(decrementCalls.length, 2);
  assert.equal(stock['air-jordan-1-chicago:43'], 4); // 5 - 1
  assert.equal(stock['samba-og:42'], 3); // 5 - 2
});

test('webhook RETRY is a no-op: stock is never drawn down twice', async () => {
  const { store, stock, decrementCalls } = makeStore(LINES);
  await fulfilPaidOrder(store, 'order_1'); // first delivery
  const retry = await fulfilPaidOrder(store, 'order_1'); // Stripe re-delivers
  assert.equal(retry.fulfilled, false);
  assert.equal(retry.linesDecremented, 0);
  assert.equal(decrementCalls.length, 2); // still 2, not 4
  assert.equal(stock['air-jordan-1-chicago:43'], 4); // unchanged by the retry
  assert.equal(stock['samba-og:42'], 3);
});

test('three rapid re-deliveries still decrement exactly once', async () => {
  const { store, decrementCalls } = makeStore(LINES);
  await Promise.all([
    fulfilPaidOrder(store, 'order_1'),
    fulfilPaidOrder(store, 'order_1'),
    fulfilPaidOrder(store, 'order_1'),
  ]);
  // markPaidOnce is atomic, so only one delivery ever decrements.
  assert.equal(decrementCalls.length, 2);
});

test('stock never goes negative even if quantity exceeds stock', async () => {
  const oversell: OrderLine[] = [{ product_slug: 'grail', size: '44', quantity: 99 }];
  const { store, stock } = makeStore(oversell);
  await fulfilPaidOrder(store, 'order_2');
  assert.equal(stock['grail:44'], 0); // clamped at 0, not -94
});
