"use client";

import { MessageCircle } from "lucide-react";
import { Reveal } from "./ui/Reveal";
import { MagneticButton } from "./ui/MagneticButton";
import { useLang } from "./LanguageProvider";
import { site } from "@/lib/data";

/** Closing reservations CTA, used once, on the home page (villa/about pages
 * carry their own page-specific CTA, so this avoids a duplicate). */
export function ClosingCTA() {
  const { t } = useLang();
  const waLink = `https://wa.me/${site.whatsapp}`;
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-mist py-24 text-ink">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky/25 blur-[130px]" />
      <div className="relative mx-auto max-w-content px-6 text-center lg:px-10">
        <Reveal>
          <span className="eyebrow justify-center">{t.closing.eyebrow}</span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-light md:text-6xl">
            {t.closing.titlePre} <span className="text-sea-gradient">{t.closing.titleAccent}</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-xl text-slate">{t.closing.subtitle}</p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <MagneticButton href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              {t.cta.reserveStay}
            </MagneticButton>
            <MagneticButton href={waLink} target="_blank" rel="noopener noreferrer" className="btn-outline">
              <MessageCircle size={16} /> {t.cta.whatsappUs}
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
