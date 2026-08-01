// Unit tests for PayPal Orders v2 amount/breakdown math (_shared/paypal-amount.ts).
// This is the money-critical seam for the PayPal rail: PayPal REJECTS an order
// whose amount.value does not exactly equal item_total + shipping, and a wrong
// shipping figure here would reproduce "Bug A" (Shopify order total silently
// disagreeing with what was actually captured) on the PayPal rail.
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPayPalAmount, isPayPalSupportedCurrency, toPayPalAmountString, PAYPAL_SUPPORTED_CURRENCIES,
} from '../supabase/functions/_shared/paypal-amount.ts';
import { toMinorUnits } from '../supabase/functions/_shared/money.ts';

test('amount.value ALWAYS equals item_total + shipping (PayPal rejects otherwise)', () => {
  const items = [
    { name: 'The Court Skirt / White / M', quantity: 1, unitAmountMinor: toMinorUnits(89, 'usd') },
    { name: 'Signature Bra / Black / S', quantity: 2, unitAmountMinor: toMinorUnits(45.5, 'usd') },
  ];
  const shippingMinor = toMinorUnits(9.5, 'usd');
  const { amount } = buildPayPalAmount(items, shippingMinor, 'usd');

  const expectedItemTotal = toMinorUnits(89, 'usd') + 2 * toMinorUnits(45.5, 'usd');
  assert.equal(amount.breakdown.item_total.value, (expectedItemTotal / 100).toFixed(2));
  assert.equal(amount.breakdown.shipping.value, '9.50');
  assert.equal(amount.value, ((expectedItemTotal + shippingMinor) / 100).toFixed(2));
  // Reconciliation invariant: value === item_total + shipping, computed independently.
  const itemTotalNum = Number(amount.breakdown.item_total.value);
  const shippingNum = Number(amount.breakdown.shipping.value);
  assert.equal(Number(amount.value).toFixed(2), (itemTotalNum + shippingNum).toFixed(2));
});

test('complimentary shipping (0) still emits a shipping breakdown line of 0.00', () => {
  const items = [{ name: 'Flow Dress', quantity: 1, unitAmountMinor: toMinorUnits(496, 'aed') }];
  const { amount } = buildPayPalAmount(items, 0, 'usd');
  assert.equal(amount.breakdown.shipping.value, '0.00');
  assert.equal(amount.value, amount.breakdown.item_total.value);
});

test('items[] carries currency-correct per-unit amounts, not the line total', () => {
  const items = [{ name: 'Ace Dress', quantity: 3, unitAmountMinor: toMinorUnits(20, 'usd') }];
  const { items: ppItems } = buildPayPalAmount(items, 0, 'usd');
  assert.equal(ppItems[0].quantity, '3');
  assert.equal(ppItems[0].unit_amount.value, '20.00'); // per-unit, not 60.00
});

test('item name is truncated to PayPal\'s 127-char limit', () => {
  const longName = 'X'.repeat(200);
  const { items: ppItems } = buildPayPalAmount(
    [{ name: longName, quantity: 1, unitAmountMinor: 100 }], 0, 'usd',
  );
  assert.equal(ppItems[0].name.length, 127);
});

test('toPayPalAmountString formats 2-decimal currencies correctly', () => {
  assert.equal(toPayPalAmountString(toMinorUnits(68, 'eur'), 'eur'), '68.00');
  assert.equal(toPayPalAmountString(toMinorUnits(19.9, 'usd'), 'usd'), '19.90');
});

test('isPayPalSupportedCurrency: AED is NOT supported (verified against PayPal docs 2026-07-28)', () => {
  assert.equal(isPayPalSupportedCurrency('AED'), false);
  assert.equal(isPayPalSupportedCurrency('aed'), false); // case-insensitive
  assert.equal(isPayPalSupportedCurrency('USD'), true);
  assert.equal(isPayPalSupportedCurrency('EUR'), true);
  assert.ok(!PAYPAL_SUPPORTED_CURRENCIES.includes('AED'));
  assert.ok(!PAYPAL_SUPPORTED_CURRENCIES.includes('SAR'));
  assert.ok(!PAYPAL_SUPPORTED_CURRENCIES.includes('KWD'));
});

test('currency_code is upper-cased consistently across amount and items', () => {
  const { amount, items } = buildPayPalAmount(
    [{ name: 'Item', quantity: 1, unitAmountMinor: 1000 }], 0, 'usd',
  );
  assert.equal(amount.currency_code, 'USD');
  assert.equal(items[0].unit_amount.currency_code, 'USD');
});
