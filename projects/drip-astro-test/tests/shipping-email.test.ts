// Unit tests for the shipped + refund email builders and courier links
// (src/lib/order-email.ts). Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildShippedEmail,
  buildRefundEmail,
  courierTrackingUrl,
  type EmailItem,
} from '../src/lib/order-email.ts';

const ITEMS: EmailItem[] = [
  { name: 'Jordan 4 Retro University Blue', brand: 'Nike', size: '44', quantity: 1, unit_price_cents: 45000 },
];
const ORDER = { orderId: 'cd34ef56-0000-4000-8000-000000000000', totalCents: 45000 };

test('shipped email: EL + EN, order number, tracking number and courier link', () => {
  const m = buildShippedEmail(
    { ...ORDER, trackingNumber: 'AC123456789GR', courier: 'ACS' },
    ITEMS,
    { siteUrl: 'https://drip.store' },
  );
  assert.match(m.subject, /#CD34EF56/);
  assert.match(m.subject, /απεστάλη/);
  assert.match(m.html, /καθ' οδόν/);
  assert.match(m.html, /Your order is on its way/);
  assert.match(m.html, /AC123456789GR/);
  assert.match(m.html, /acscourier\.net.*AC123456789GR/);
  assert.match(m.text, /Tracking: ACS · AC123456789GR/);
});

test('shipped email without tracking still sends cleanly (no link, no empty block)', () => {
  const m = buildShippedEmail(ORDER, ITEMS);
  assert.doesNotMatch(m.html, /Παρακολούθηση · Tracking/);
  assert.doesNotMatch(m.html, /acscourier/);
  assert.match(m.html, /Jordan 4 Retro University Blue/);
});

test('unknown courier shows the number without a link', () => {
  const m = buildShippedEmail({ ...ORDER, trackingNumber: 'XX99', courier: 'Random Courier' }, ITEMS);
  assert.match(m.html, /XX99/);
  assert.doesNotMatch(m.html, /Track parcel/);
  assert.equal(courierTrackingUrl('Random Courier', 'XX99'), null);
});

test('courier link map covers the Greek couriers, case-insensitively', () => {
  assert.match(courierTrackingUrl('acs', 'T1')!, /acscourier\.net/);
  assert.match(courierTrackingUrl('ELTA', 'T1')!, /elta-courier\.gr/);
  assert.match(courierTrackingUrl('Speedex', 'T1')!, /speedex\.gr/);
  assert.match(courierTrackingUrl('Box Now', 'T1')!, /boxnow\.gr/);
  assert.match(courierTrackingUrl('DHL', 'T1')!, /dhl\.com/);
  assert.match(courierTrackingUrl('UPS', 'T1')!, /ups\.com/);
  // tracking numbers are URL-encoded
  assert.match(courierTrackingUrl('acs', 'A B/C')!, /A%20B%2FC/);
});

test('refund email: EL + EN, precise amount, bank-delay note, compliance footer', () => {
  const m = buildRefundEmail(ORDER, ITEMS, { siteUrl: 'https://drip.store' });
  assert.match(m.subject, /Επιστροφή χρημάτων/);
  assert.match(m.html, /450,00/); // receipt-precise
  assert.match(m.html, /εργάσιμες/);
  assert.match(m.html, /Your refund is complete/);
  assert.match(m.html, /Κασσαβέτη 4/); // seller identity block present here too
  assert.match(m.html, /drip\.store\/returns/);
});

test('no em-dashes in the new builders', () => {
  const EM_DASH = String.fromCharCode(0x2014);
  for (const m of [
    buildShippedEmail({ ...ORDER, trackingNumber: 'T', courier: 'ACS' }, ITEMS),
    buildRefundEmail(ORDER, ITEMS),
  ]) {
    assert.ok(!m.subject.includes(EM_DASH) && !m.html.includes(EM_DASH) && !m.text.includes(EM_DASH));
  }
});
