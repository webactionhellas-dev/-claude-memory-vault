"use client";

// GDPR / ePrivacy consent banner. Self-contained: no external deps, bilingual by
// the document's <html lang> (el/en). Essential cookies (locale) run without consent;
// gate any analytics/marketing scripts on window.__consent === "granted".
import { useEffect, useState } from "react";

const COPY = {
  en: {
    text: "We use essential cookies to run the site. With your consent we also use analytics to improve it.",
    link: "Privacy policy",
    accept: "Accept",
    decline: "Decline",
  },
  el: {
    text: "Χρησιμοποιούμε απαραίτητα cookies για τη λειτουργία του site. Με τη συγκατάθεσή σας χρησιμοποιούμε και analytics για τη βελτίωσή του.",
    link: "Πολιτική απορρήτου",
    accept: "Αποδοχή",
    decline: "Άρνηση",
  },
};

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [lang, setLang] = useState<"en" | "el">("en");

  useEffect(() => {
    try {
      setLang(document.documentElement.lang === "el" ? "el" : "en");
      const saved = localStorage.getItem("wa-consent");
      if (saved !== "granted" && saved !== "denied") setShow(true);
    } catch {
      /* storage unavailable */
    }
  }, []);

  function choose(v: "granted" | "denied") {
    try {
      localStorage.setItem("wa-consent", v);
      (window as unknown as { __consent?: string }).__consent = v;
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;
  const t = COPY[lang];

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      style={{
        position: "fixed", left: "1rem", right: "1rem", bottom: "1rem", zIndex: 9999,
        maxWidth: "46rem", margin: "0 auto", display: "flex", flexWrap: "wrap",
        gap: "0.6rem 1rem", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.15rem", borderRadius: 14, background: "#111", color: "#f5f5f5",
        boxShadow: "0 10px 40px rgba(0,0,0,.35)", fontSize: ".9rem", lineHeight: 1.45,
      }}
    >
      <p style={{ margin: 0, flex: "1 1 20rem" }}>
        {t.text}{" "}
        <a href="/privacy" style={{ color: "#fff", textDecoration: "underline" }}>{t.link}</a>
      </p>
      <div style={{ display: "flex", gap: ".5rem", flex: "0 0 auto" }}>
        <button
          type="button"
          onClick={() => choose("denied")}
          style={{ cursor: "pointer", padding: ".55rem 1.1rem", borderRadius: 9, fontWeight: 600, background: "transparent", color: "#f5f5f5", border: "1px solid rgba(245,245,245,.4)" }}
        >
          {t.decline}
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          style={{ cursor: "pointer", padding: ".55rem 1.1rem", borderRadius: 9, fontWeight: 600, background: "#f5f5f5", color: "#111", border: 0 }}
        >
          {t.accept}
        </button>
      </div>
    </div>
  );
}
