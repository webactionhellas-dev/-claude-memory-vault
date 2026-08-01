// One-off / handover utility: send a REAL order-confirmation email through
// Resend using the exact production template, so email delivery can be
// verified end to end without a Stripe payment.
//
//   node --env-file=.env scripts/send-test-email.mjs you@example.com
//
// Unverified Resend accounts deliver only to the account owner's address,
// from onboarding@resend.dev (normal test mode).
import { buildOrderEmail } from '../src/lib/order-email.ts';
import { sendEmail, emailReady, emailFrom } from '../src/lib/email.ts';

const to = process.argv[2];
if (!to) {
  console.error('usage: node --env-file=.env scripts/send-test-email.mjs <recipient>');
  process.exit(1);
}
if (!emailReady()) {
  console.error('RESEND_API_KEY is not set in .env');
  process.exit(1);
}

const built = buildOrderEmail(
  {
    orderId: 'test0001-0000-0000-0000-000000000000',
    totalCents: 129999,
    shipping: {
      name: 'Test Customer',
      line1: 'Kassaveti 4',
      city: 'Kifisia',
      postal_code: '145 62',
      country: 'GR',
    },
  },
  [
    { name: 'Air Jordan 4 Orchid', brand: 'Jordan', size: '42', quantity: 1, unit_price_cents: 89999 },
    { name: 'Nike Kobe 4 Protro Girl Dad', brand: 'Nike', size: '43', quantity: 1, unit_price_cents: 40000 },
  ],
);

console.log('from:', emailFrom());
console.log('to:  ', to);
console.log('subj:', built.subject);
const r = await sendEmail({ to, subject: built.subject, html: built.html, text: built.text });
console.log('result:', JSON.stringify(r));
process.exit(r.ok ? 0 : 1);
