import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Pickup-booking endpoint.
 *
 * By default this just validates the payload and logs it, so the site works
 * out of the box. To actually receive bookings by email, add a Resend API key
 * to your environment (see .env.example), and the code below picks it up
 * automatically. No extra npm package required (we call the REST API directly).
 *
 *   1. Create an account at https://resend.com and verify your domain.
 *   2. Set RESEND_API_KEY, BOOKING_TO_EMAIL and BOOKING_FROM_EMAIL.
 *   3. Redeploy. Done.
 */

const bookingSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(2),
  date: z.string().optional(),
  services: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 422 });
  }

  const b = parsed.data;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Not configured yet. Log so it is visible in dev, and succeed so the
    // client can still hand the lead off to WhatsApp.
    console.info("[booking] received (email delivery not configured):", b);
    return NextResponse.json({ ok: true, delivered: false });
  }

  const html = `
    <h2>Νέο αίτημα παραλαβής · Green Cleaners</h2>
    <ul>
      <li><strong>Όνομα:</strong> ${esc(b.name)}</li>
      <li><strong>Τηλέφωνο:</strong> ${esc(b.phone)}</li>
      <li><strong>Email:</strong> ${esc(b.email || "-")}</li>
      <li><strong>Διεύθυνση:</strong> ${esc(b.address)}</li>
      <li><strong>Ημερομηνία:</strong> ${esc(b.date || "-")}</li>
      <li><strong>Υπηρεσίες:</strong> ${esc((b.services || []).join(", ") || "-")}</li>
      <li><strong>Σημειώσεις:</strong> ${esc(b.notes || "-")}</li>
    </ul>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.BOOKING_FROM_EMAIL ?? "Green Cleaners <onboarding@resend.dev>",
        to: [process.env.BOOKING_TO_EMAIL ?? "greencleanershellas@gmail.com"],
        reply_to: b.email || undefined,
        subject: `Νέα παραλαβή · ${b.name}`,
        html,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return NextResponse.json({ ok: true, delivered: true });
  } catch (err) {
    console.error("[booking] email delivery failed:", err);
    // Still report success to the user; the WhatsApp fallback covers the lead.
    return NextResponse.json({ ok: true, delivered: false });
  }
}

function esc(s: string) {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string);
}
