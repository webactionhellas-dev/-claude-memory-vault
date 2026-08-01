// Pure builders for the transactional order emails. No env, no fetch, no SDK,
// so the content (bilingual copy, totals, layout) is unit-tested in
// tests/order-email.test.ts without Resend or Stripe. The impure sending lives
// in lib/email.ts; the webhook wires the two together after fulfilment.
//
// Email-client rules honored here: table layout, inline styles only, bgcolor
// attributes, system font stack, no external CSS, max width 600. Greek first,
// English below, matching the storefront (Greek default). No em-dashes.

export interface EmailItem {
  name: string;
  brand?: string | null;
  size: string;
  quantity: number;
  unit_price_cents: number;
}

export interface ShippingAddress {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface OrderEmailInput {
  orderId: string;
  totalCents: number;
  shipping?: ShippingAddress | null;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

/** Receipt-precise EUR (the storefront rounds for display; a receipt must not). */
export const fmtCents = (cents: number): string =>
  new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

/** Short human order number, same format the admin table shows (#AB12CD34). */
export const orderNumber = (orderId: string): string =>
  `#${String(orderId).slice(0, 8).toUpperCase()}`;

/** Map a Stripe Checkout Session to our shipping shape (null when absent). */
export function shippingFromSession(session: any): ShippingAddress | null {
  const s =
    session?.shipping_details ??
    session?.collected_information?.shipping_details ??
    session?.customer_details ??
    null;
  const a = s?.address;
  if (!a || (!a.line1 && !a.city)) return null;
  return {
    name: s.name ?? null,
    line1: a.line1 ?? null,
    line2: a.line2 ?? null,
    city: a.city ?? null,
    postal_code: a.postal_code ?? null,
    country: a.country ?? null,
  };
}

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const addressLines = (sh: ShippingAddress): string[] =>
  [
    sh.name,
    sh.line1,
    sh.line2,
    [sh.postal_code, sh.city].filter(Boolean).join(' '),
    sh.country,
  ].filter((v): v is string => !!v && String(v).trim().length > 0);

// Palette: matches the storefront tokens (dark base, tiffany accent).
const C = {
  base: '#0a0a0b',
  raised: '#141416',
  line: '#26262a',
  ink: '#f5f5f4',
  muted: '#a1a1aa',
  accent: '#00c0b6',
};

function itemsTableHtml(items: EmailItem[]): string {
  const rows = items
    .map(
      (it) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${C.line};color:${C.ink};font-size:14px;">
            ${esc(it.name)}
            <span style="color:${C.muted};font-size:12px;display:block;">${esc(it.brand ?? '')}${it.brand ? ' · ' : ''}Size ${esc(it.size)} · x${it.quantity}</span>
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};color:${C.ink};font-size:14px;white-space:nowrap;">
            ${fmtCents(it.unit_price_cents * it.quantity)}
          </td>
        </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>`;
}

// Seller identity (EU distance-selling info in every transactional email).
// Real client facts. ΑΦΜ (VAT id) and ΓΕΜΗ (registry number) are intentionally
// OMITTED until the client provides them; add them here the day they arrive.
// Never render placeholder values as if they were real.
const SELLER = {
  name: 'DRIP',
  address: 'Κασσαβέτη 4, Κηφισιά 145 62',
  phone: '+30 212 121 2147',
  email: 'hello@drip.store',
};

export interface OrderEmailOpts {
  /** Absolute site origin for links inside the email. */
  siteUrl?: string;
}

const cleanSiteUrl = (u?: string) => (u || 'https://drip.store').replace(/\/+$/, '');

function complianceFooterHtml(siteUrl: string): string {
  return `
          <hr style="border:none;border-top:1px solid ${C.line};margin:28px 0;" />
          <p style="margin:0;color:${C.muted};font-size:12px;line-height:1.7;">
            ${esc(SELLER.name)} · ${esc(SELLER.address)} · ${esc(SELLER.phone)} ·
            <a href="mailto:${SELLER.email}" style="color:${C.accent};text-decoration:none;">${SELLER.email}</a>
          </p>
          <p style="margin:10px 0 0;color:${C.muted};font-size:12px;line-height:1.7;">
            Έχετε δικαίωμα υπαναχώρησης εντός 14 ημερών από την παραλαβή, χωρίς αιτιολογία.
            Όροι επιστροφών: <a href="${siteUrl}/returns" style="color:${C.accent};text-decoration:none;">${siteUrl}/returns</a><br/>
            You have a 14-day right of withdrawal from delivery, no questions asked.
            Returns policy: <a href="${siteUrl}/returns" style="color:${C.accent};text-decoration:none;">${siteUrl}/returns</a>
          </p>`;
}

function complianceFooterText(siteUrl: string): string[] {
  return [
    '',
    `${SELLER.name} · ${SELLER.address} · ${SELLER.phone} · ${SELLER.email}`,
    `Δικαίωμα υπαναχώρησης 14 ημερών από την παραλαβή. Όροι επιστροφών: ${siteUrl}/returns`,
    `14-day right of withdrawal from delivery. Returns policy: ${siteUrl}/returns`,
  ];
}

/** Shared dark-card shell so every transactional email looks identical. */
function emailShell(cardInner: string): string {
  return `
<div style="margin:0;padding:0;background-color:${C.base};" bgcolor="${C.base}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.base}" style="background-color:${C.base};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 20px;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;letter-spacing:.14em;color:${C.ink};">DRIP</span>
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:${C.accent};">.</span>
        </td></tr>
        <tr><td bgcolor="${C.raised}" style="background-color:${C.raised};border:1px solid ${C.line};border-radius:16px;padding:28px;font-family:Arial,Helvetica,sans-serif;">
${cardInner}
        </td></tr>
        <tr><td align="center" style="padding:20px 8px 0;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0;color:${C.muted};font-size:12px;">DRIP · Luxury sneakers &amp; streetwear · Αθήνα / Athens</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;
}

/* Tracking links for the couriers the store actually ships with. Unknown
   couriers still show the tracking number, just without a link. */
export function courierTrackingUrl(courier: string, tracking: string): string | null {
  const t = encodeURIComponent(tracking.trim());
  switch (courier.trim().toLowerCase()) {
    case 'acs': return `https://www.acscourier.net/el/track-and-trace/?trackingNumber=${t}`;
    case 'elta': return `https://www.elta-courier.gr/search?br=${t}`;
    case 'speedex': return `https://www.speedex.gr/isapohi.asp?voucher_code=${t}`;
    case 'geniki':
    case 'geniki taxydromiki':
    case 'court': return `https://www.taxydromiki.com/track/${t}`;
    case 'boxnow':
    case 'box now': return `https://boxnow.gr/track?parcelId=${t}`;
    case 'dhl': return `https://www.dhl.com/gr-en/home/tracking.html?tracking-id=${t}`;
    case 'ups': return `https://www.ups.com/track?tracknum=${t}`;
    default: return null;
  }
}

/** The customer's branded order confirmation. Greek first, English below. */
export function buildOrderEmail(
  order: OrderEmailInput,
  items: EmailItem[],
  opts: OrderEmailOpts = {},
): BuiltEmail {
  const siteUrl = cleanSiteUrl(opts.siteUrl);
  const num = orderNumber(order.orderId);
  const total = fmtCents(order.totalCents);
  const sh = order.shipping ?? null;

  const subject = `Επιβεβαίωση παραγγελίας ${num} · DRIP`;

  const shippingHtml = sh
    ? `
      <p style="margin:28px 0 6px;color:${C.muted};font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Διεύθυνση αποστολής · Shipping address</p>
      <p style="margin:0;color:${C.ink};font-size:14px;line-height:1.6;">${addressLines(sh).map(esc).join('<br/>')}</p>`
    : '';

  const html = emailShell(`
          <p style="margin:0;color:${C.accent};font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Παραγγελία ${num}</p>
          <h1 style="margin:10px 0 0;color:${C.ink};font-size:22px;line-height:1.3;">Ευχαριστούμε για την παραγγελία σας!</h1>
          <p style="margin:12px 0 0;color:${C.muted};font-size:14px;line-height:1.6;">
            Η πληρωμή σας ολοκληρώθηκε και ετοιμάζουμε το δέμα σας. Κάθε κομμάτι
            ελέγχεται και πιστοποιείται από την ομάδα του DRIP πριν την αποστολή.
            Θα λάβετε νέο μήνυμα μόλις η παραγγελία σας παραδοθεί στην courier.
          </p>

          <div style="margin-top:24px;">${itemsTableHtml(items)}</div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
            <tr>
              <td style="color:${C.ink};font-size:15px;font-weight:bold;">Σύνολο · Total</td>
              <td align="right" style="color:${C.accent};font-size:17px;font-weight:bold;white-space:nowrap;">${total}</td>
            </tr>
          </table>
          ${shippingHtml}

          <hr style="border:none;border-top:1px solid ${C.line};margin:28px 0;" />

          <h2 style="margin:0;color:${C.ink};font-size:16px;">Thank you for your order!</h2>
          <p style="margin:10px 0 0;color:${C.muted};font-size:13px;line-height:1.6;">
            Your payment is confirmed and we are preparing your parcel. Every piece
            is inspected and verified by the DRIP team before it ships. We will
            email you again as soon as your order is handed to the courier.
          </p>
          ${complianceFooterHtml(siteUrl)}`);

  const text = [
    `DRIP · Παραγγελία ${num}`,
    '',
    'Ευχαριστούμε για την παραγγελία σας! Η πληρωμή σας ολοκληρώθηκε και ετοιμάζουμε το δέμα σας.',
    '',
    ...items.map((it) => `- ${it.name} (Size ${it.size}) x${it.quantity}: ${fmtCents(it.unit_price_cents * it.quantity)}`),
    '',
    `Σύνολο / Total: ${total}`,
    ...(sh ? ['', 'Διεύθυνση αποστολής / Shipping address:', ...addressLines(sh)] : []),
    '',
    'Thank you for your order! Your payment is confirmed and we are preparing your parcel.',
    ...complianceFooterText(siteUrl),
  ].join('\n');

  return { subject, html, text };
}

/** Plain new-order notification for the owner (Shopify-parity merchant email). */
export function buildOwnerEmail(
  order: OrderEmailInput & { customerEmail?: string | null },
  items: EmailItem[],
): BuiltEmail {
  const num = orderNumber(order.orderId);
  const total = fmtCents(order.totalCents);
  const sh = order.shipping ?? null;

  const subject = `Νέα παραγγελία ${num} · ${total}`;
  const lines = items.map(
    (it) => `- ${it.name} (Size ${it.size}) x${it.quantity}: ${fmtCents(it.unit_price_cents * it.quantity)}`,
  );
  const text = [
    `Νέα πληρωμένη παραγγελία ${num}`,
    `Πελάτης: ${order.customerEmail ?? 'guest'}`,
    '',
    ...lines,
    '',
    `Σύνολο: ${total}`,
    ...(sh ? ['', 'Αποστολή:', ...addressLines(sh)] : []),
    '',
    'Διαχείριση: /admin',
  ].join('\n');
  const html = `<pre style="font-family:ui-monospace,Consolas,monospace;font-size:13px;line-height:1.6;">${esc(text)}</pre>`;
  return { subject, html, text };
}

export interface ShippedEmailInput extends OrderEmailInput {
  trackingNumber?: string | null;
  courier?: string | null;
}

/** "Your order shipped" with tracking number + courier link when present. */
export function buildShippedEmail(
  order: ShippedEmailInput,
  items: EmailItem[],
  opts: OrderEmailOpts = {},
): BuiltEmail {
  const siteUrl = cleanSiteUrl(opts.siteUrl);
  const num = orderNumber(order.orderId);
  const tracking = (order.trackingNumber ?? '').trim();
  const courier = (order.courier ?? '').trim();
  const trackUrl = tracking && courier ? courierTrackingUrl(courier, tracking) : null;

  const subject = `Η παραγγελία σας ${num} απεστάλη · DRIP`;

  const trackingHtml = tracking
    ? `
          <p style="margin:24px 0 6px;color:${C.muted};font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Παρακολούθηση · Tracking</p>
          <p style="margin:0;color:${C.ink};font-size:15px;line-height:1.6;">
            ${courier ? `${esc(courier)} · ` : ''}<strong>${esc(tracking)}</strong>
          </p>
          ${trackUrl ? `<p style="margin:14px 0 0;"><a href="${trackUrl}" style="display:inline-block;background:${C.accent};color:#04211f;font-weight:bold;font-size:14px;padding:11px 22px;border-radius:999px;text-decoration:none;">Παρακολούθηση δέματος · Track parcel</a></p>` : ''}`
    : '';

  const html = emailShell(`
          <p style="margin:0;color:${C.accent};font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Παραγγελία ${num}</p>
          <h1 style="margin:10px 0 0;color:${C.ink};font-size:22px;line-height:1.3;">Το δέμα σας είναι καθ' οδόν!</h1>
          <p style="margin:12px 0 0;color:${C.muted};font-size:14px;line-height:1.6;">
            Η παραγγελία σας παραδόθηκε στην courier και ταξιδεύει προς εσάς.
          </p>
          ${trackingHtml}
          <div style="margin-top:24px;">${itemsTableHtml(items)}</div>

          <hr style="border:none;border-top:1px solid ${C.line};margin:28px 0;" />

          <h2 style="margin:0;color:${C.ink};font-size:16px;">Your order is on its way!</h2>
          <p style="margin:10px 0 0;color:${C.muted};font-size:13px;line-height:1.6;">
            Your parcel has been handed to the courier${tracking ? ` with tracking number ${esc(tracking)}` : ''}.
          </p>
          ${complianceFooterHtml(siteUrl)}`);

  const text = [
    `DRIP · Παραγγελία ${num} · Απεστάλη`,
    '',
    'Το δέμα σας παραδόθηκε στην courier και ταξιδεύει προς εσάς.',
    ...(tracking ? ['', `Παρακολούθηση / Tracking: ${courier ? courier + ' · ' : ''}${tracking}`, ...(trackUrl ? [trackUrl] : [])] : []),
    '',
    ...items.map((it) => `- ${it.name} (Size ${it.size}) x${it.quantity}`),
    '',
    'Your order is on its way!',
    ...complianceFooterText(siteUrl),
  ].join('\n');

  return { subject, html, text };
}

/** Refund confirmation for the customer. */
export function buildRefundEmail(
  order: OrderEmailInput,
  items: EmailItem[],
  opts: OrderEmailOpts = {},
): BuiltEmail {
  const siteUrl = cleanSiteUrl(opts.siteUrl);
  const num = orderNumber(order.orderId);
  const total = fmtCents(order.totalCents);

  const subject = `Επιστροφή χρημάτων για την παραγγελία ${num} · DRIP`;

  const html = emailShell(`
          <p style="margin:0;color:${C.accent};font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Παραγγελία ${num}</p>
          <h1 style="margin:10px 0 0;color:${C.ink};font-size:22px;line-height:1.3;">Η επιστροφή χρημάτων ολοκληρώθηκε</h1>
          <p style="margin:12px 0 0;color:${C.muted};font-size:14px;line-height:1.6;">
            Επιστρέψαμε <strong style="color:${C.ink};">${total}</strong> στο μέσο πληρωμής σας.
            Ανάλογα με την τράπεζά σας, μπορεί να χρειαστούν 5 έως 10 εργάσιμες
            ημέρες για να εμφανιστεί στον λογαριασμό σας.
          </p>
          <div style="margin-top:24px;">${itemsTableHtml(items)}</div>

          <hr style="border:none;border-top:1px solid ${C.line};margin:28px 0;" />

          <h2 style="margin:0;color:${C.ink};font-size:16px;">Your refund is complete</h2>
          <p style="margin:10px 0 0;color:${C.muted};font-size:13px;line-height:1.6;">
            We refunded ${total} to your original payment method. Depending on
            your bank it can take 5 to 10 business days to appear on your account.
          </p>
          ${complianceFooterHtml(siteUrl)}`);

  const text = [
    `DRIP · Παραγγελία ${num} · Επιστροφή χρημάτων`,
    '',
    `Επιστρέψαμε ${total} στο μέσο πληρωμής σας (5 έως 10 εργάσιμες ημέρες ανάλογα με την τράπεζα).`,
    '',
    ...items.map((it) => `- ${it.name} (Size ${it.size}) x${it.quantity}`),
    '',
    `Your refund of ${total} is complete (5 to 10 business days depending on your bank).`,
    ...complianceFooterText(siteUrl),
  ].join('\n');

  return { subject, html, text };
}
