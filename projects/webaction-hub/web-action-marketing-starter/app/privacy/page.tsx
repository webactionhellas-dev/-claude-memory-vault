import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: "48rem", margin: "0 auto", padding: "8rem 1.5rem 6rem", lineHeight: 1.65 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.25rem" }}>Privacy Policy</h1>
      <p style={{ background: "rgba(200,150,0,.12)", border: "1px solid rgba(200,150,0,.4)", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1.5rem", fontSize: ".9rem" }}>
        <strong>TODO before launch:</strong> Replace this placeholder with your reviewed policy. The GDPR
        requires the data-controller identity and contact, the lawful basis, data retention periods, and the
        user rights below. Localize to Greek if Greek is your default market.
      </p>

      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "1.5rem 0 .5rem" }}>What we collect</h2>
      <p>Enquiry details you send us (name, email, message) to respond to you, and optional analytics only
        with your consent. This marketing site does not process payments.</p>

      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "1.5rem 0 .5rem" }}>Cookies</h2>
      <p>An essential cookie remembers your language. Analytics or marketing cookies load only after you
        accept the cookie banner; you can change your choice by clearing site data.</p>

      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "1.5rem 0 .5rem" }}>Your rights</h2>
      <p>Under the GDPR you can request access, correction, deletion, or portability of your data. Contact{" "}
        <a style={{ textDecoration: "underline" }} href="mailto:privacy@example.com">privacy@example.com</a>.</p>
    </main>
  );
}
