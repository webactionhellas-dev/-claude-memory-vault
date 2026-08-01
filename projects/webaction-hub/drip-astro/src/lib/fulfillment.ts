// Pure orchestration for the paid-order webhook — the money path's idempotency
// seam. Stripe retries `checkout.session.completed`, and inventory drawdown is
// NOT reversible, so stock must be decremented at most once per order, however
// many times the event is delivered. The single guarantee here: decrement runs
// only when the order flips pending -> paid for the FIRST time. Making that flip
// atomic is the store's job (a conditional `UPDATE ... WHERE status <> 'paid'`,
// which Postgres serialises with a row lock); this function just sequences it so
// the whole thing can be unit-tested without Stripe or a database. See
// tests/fulfillment.test.ts. The real store lives in api/stripe-webhook.ts.

export interface OrderLine {
  product_slug: string;
  size: string;
  quantity: number;
}

export interface FulfilmentStore {
  /**
   * Atomically flip the order pending -> paid. MUST return true for exactly the
   * first caller and false for every retry — enforce with an atomic conditional
   * update, never a read-then-write.
   */
  markPaidOnce(orderId: string): Promise<boolean>;
  /** The paid order's line items (only read when we actually fulfil). */
  getLines(orderId: string): Promise<OrderLine[]>;
  /** Draw down live stock for one line (the RPC clamps at 0, never negative). */
  decrement(line: OrderLine): Promise<void>;
}

/**
 * Fulfil a paid order idempotently. Returns whether this delivery was the one
 * that fulfilled the order, and how many lines it drew down. Retries return
 * `{ fulfilled: false, linesDecremented: 0 }` and touch no stock.
 */
export async function fulfilPaidOrder(
  store: FulfilmentStore,
  orderId: string,
): Promise<{ fulfilled: boolean; linesDecremented: number }> {
  const firstDelivery = await store.markPaidOnce(orderId);
  if (!firstDelivery) return { fulfilled: false, linesDecremented: 0 };
  const lines = await store.getLines(orderId);
  for (const line of lines) await store.decrement(line);
  return { fulfilled: true, linesDecremented: lines.length };
}

/* ------------------------------------------------------------------ */
/* Webhook event routing (pure).                                       */
/* ------------------------------------------------------------------ */

// What a Stripe webhook delivery should do to the order. Decided PURELY from
// the event type + session payment_status so it can be unit-tested:
// - 'fulfil'  -> mark paid + draw down stock + emails (idempotent downstream)
// - 'wait'    -> completed arrived but the async payment has not settled yet
//                (bank transfers etc.); leave the order pending and log
// - 'fail'    -> the async payment failed; cancel the pending order
// - 'cleanup' -> the session expired unpaid; delete the pending order
// - 'ignore'  -> event we do not act on
export type WebhookAction = 'fulfil' | 'wait' | 'fail' | 'cleanup' | 'ignore';

export function actionForEvent(
  eventType: string,
  session: { payment_status?: string | null } | null | undefined,
): WebhookAction {
  switch (eventType) {
    case 'checkout.session.completed': {
      const ps = session?.payment_status;
      // 'no_payment_required' happens on a 100% promo code: the order IS
      // complete and must be fulfilled even though nothing was charged.
      if (ps === 'paid' || ps === 'no_payment_required') return 'fulfil';
      return 'wait';
    }
    case 'checkout.session.async_payment_succeeded':
      return 'fulfil';
    case 'checkout.session.async_payment_failed':
      return 'fail';
    case 'checkout.session.expired':
      return 'cleanup';
    default:
      return 'ignore';
  }
}

/* ------------------------------------------------------------------ */
/* Expired-session cleanup (pure orchestration).                       */
/* ------------------------------------------------------------------ */

export interface CleanupStore {
  /**
   * Delete the order ONLY while it is still pending (order_items cascade via
   * their FK). MUST be a single conditional DELETE ... WHERE status='pending'
   * returning whether a row went away, so retries and late deliveries are
   * naturally idempotent and a paid order can never be deleted.
   */
  deletePendingOrder(orderId: string): Promise<boolean>;
}

/** Idempotently remove an abandoned pending order. */
export async function cleanupExpiredOrder(
  store: CleanupStore,
  orderId: string,
): Promise<{ deleted: boolean }> {
  const deleted = await store.deletePendingOrder(orderId);
  return { deleted };
}
