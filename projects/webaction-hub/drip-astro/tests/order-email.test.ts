// Unit tests for the pure order-email builders (src/lib/order-email.ts).
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOrderEmail,
  buildOwnerEmail,
  shippingFromSession,
  fmtCents,
  orderNumber,
  type EmailItem,
} from '../src/lib/order-email.ts';

const ITEMS: EmailItem[] = [
  { name: 'Jordan 1 Retro High Chicago', brand: 'Nike', size: '43', quantity: 1, unit_price_cents: 120000 },
  { name: 'Samba OG', brand: 'adidas', size: '42', quantity: 2, unit_price_cents: 11000 },
];
const ORDER = {
  orderId: 'ab12cd34-0000-4000-8000-000000000000',
  totalCents: 142000,
  shipping: { name: 'Nikos P.', line1: 'Ermou 1', city: 'Athens', postal_code: '10563', country: 'GR' },
};

test('customer email carries Greek AND English copy', () => {
  const m = buildOrderEmail(ORDER, ITEMS);
  assert.match(m.html, /Ευχαριστούμε για την παραγγελία σας/);
  assert.match(m.html, /Thank you for your order/);
  assert.match(m.subject, /Επιβεβαίωση παραγγελίας/);
});

test('order number and receipt-precise total are correct', () => {
  const m = buildOrderEmail(ORDER, ITEMS);
  assert.match(m.subject, /#AB12CD34/);
  assert.equal(orderNumber(ORDER.orderId), '#AB12CD34');
  // 142000 cents -> 1.420,00 EUR in el-GR (non-breaking space before the sign)
  assert.match(m.html, /1\.420,00/);
  assert.match(fmtCents(12999), /129,99/); // no display rounding on a receipt
});

test('every line item appears with name, size, quantity and line total', () => {
  const m = buildOrderEmail(ORDER, ITEMS);
  assert.match(m.html, /Jordan 1 Retro High Chicago/);
  assert.match(m.html, /Size 43/);
  assert.match(m.html, /Samba OG/);
  assert.match(m.html, /x2/);
  assert.match(m.html, /220,00/); // 2 x 110.00
  assert.match(m.text, /Samba OG \(Size 42\) x2/);
});

test('shipping address renders when present, and is omitted cleanly when missing', () => {
  const withAddr = buildOrderEmail(ORDER, ITEMS);
  assert.match(withAddr.html, /Ermou 1/);
  assert.match(withAddr.html, /10563 Athens/);
  const without = buildOrderEmail({ ...ORDER, shipping: null }, ITEMS);
  assert.doesNotMatch(without.html, /Διεύθυνση αποστολής/);
  assert.doesNotMatch(without.text, /Shipping address/);
});

test('no em-dashes anywhere in subject, html, or text', () => {
  const EM_DASH = String.fromCharCode(0x2014);
  for (const m of [buildOrderEmail(ORDER, ITEMS), buildOwnerEmail({ ...ORDER, customerEmail: 'a@b.gr' }, ITEMS)]) {
    assert.ok(!m.subject.includes(EM_DASH), 'em-dash in subject');
    assert.ok(!m.html.includes(EM_DASH), 'em-dash in html');
    assert.ok(!m.text.includes(EM_DASH), 'em-dash in text');
  }
});

test('html-unsafe product names are escaped', () => {
  const m = buildOrderEmail(ORDER, [
    { name: '<script>alert(1)</script>', size: 'OS', quantity: 1, unit_price_cents: 100 },
  ]);
  assert.doesNotMatch(m.html, /<script>alert/);
  assert.match(m.html, /&lt;script&gt;/);
});

test('owner notification names the order, customer, total and items', () => {
  const m = buildOwnerEmail({ ...ORDER, customerEmail: 'nikos@example.gr' }, ITEMS);
  assert.match(m.subject, /Νέα παραγγελία #AB12CD34/);
  assert.match(m.subject, /1\.420,00/);
  assert.match(m.text, /nikos@example\.gr/);
  assert.match(m.text, /Jordan 1 Retro High Chicago/);
});

test('shippingFromSession prefers shipping_details, falls back, and nulls cleanly', () => {
  const ship = { name: 'A', address: { line1: 'Ship St 1', city: 'Athens', postal_code: '111', country: 'GR' } };
  const bill = { name: 'B', address: { line1: 'Bill St 2', city: 'Patras', postal_code: '222', country: 'GR' } };
  assert.equal(shippingFromSession({ shipping_details: ship, customer_details: bill })?.line1, 'Ship St 1');
  assert.equal(shippingFromSession({ customer_details: bill })?.line1, 'Bill St 2');
  assert.equal(shippingFromSession({ customer_details: { email: 'x@y.gr' } }), null);
  assert.equal(shippingFromSession({}), null);
});

test('compliance: seller identity block is present (no ΑΦΜ/ΓΕΜΗ until facts arrive)', () => {
  const m = buildOrderEmail(ORDER, ITEMS);
  assert.match(m.html, /Κασσαβέτη 4, Κηφισιά 145 62/);
  assert.match(m.html, /\+30 212 121 2147/);
  assert.match(m.html, /hello@drip\.store/);
  assert.doesNotMatch(m.html, /ΑΦΜ|ΓΕΜΗ/); // omitted entirely, never faked
  assert.match(m.text, /Κασσαβέτη 4/);
});

test('compliance: 14-day withdrawal notice with the /returns link, EL + EN', () => {
  const m = buildOrderEmail(ORDER, ITEMS, { siteUrl: 'https://drip.store/' });
  assert.match(m.html, /υπαναχώρησης εντός 14 ημερών/);
  assert.match(m.html, /right of withdrawal/);
  assert.match(m.html, /https:\/\/drip\.store\/returns/); // trailing slash normalised
  assert.match(m.text, /drip\.store\/returns/);
});
