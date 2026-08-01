import { NextResponse } from 'next/server';

interface BookingPayload {
  name?: string;
  email?: string;
  phone?: string;
  studio?: string;
  service?: string;
  idea?: string;
  date?: string;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );
}

export async function POST(request: Request) {
  let body: BookingPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-request' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  const idea = (body.idea ?? '').trim();

  // Server-side validation
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !idea) {
    return NextResponse.json({ ok: false, reason: 'validation' }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_TO_EMAIL || 'unicorntattoo2001@gmail.com';
  const from = process.env.BOOKING_FROM_EMAIL || 'bookings@unicorntattoo.gr';

  // No provider configured yet → tell the client to use the mailto fallback.
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: 'no-provider' }, { status: 200 });
  }

  const rows = [
    ['Name', name],
    ['Email', email],
    ['Phone', body.phone],
    ['Studio', body.studio],
    ['Service', body.service],
    ['Preferred date', body.date],
    ['Idea', idea]
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#888">${k}</td><td>${escapeHtml(String(v))}</td></tr>`)
    .join('');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Unicorn Tattoo <${from}>`,
        to: [to],
        reply_to: email,
        subject: `Booking request - ${name}`,
        html: `<h2>New booking request</h2><table>${rows}</table>`
      })
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: 'provider-error' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: 'provider-error' }, { status: 502 });
  }
}
