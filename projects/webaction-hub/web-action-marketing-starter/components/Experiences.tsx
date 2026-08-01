"use client";

import { Reveal } from "./ui/Reveal";
import { useLang } from "./LanguageProvider";
import { experiences, site } from "@/lib/data";

export function Experiences() {
  const { t } = useLang();
  return (
    <section id="experiences" className="section relative overflow-hidden bg-mist scroll-mt-24">
      {/* soft photographic backdrop (low opacity) so the section breathes */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.10]"
        style={{ backgroundImage: "url(/media/villas/thalassa/th_20.webp)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-mist/60 via-mist/85 to-mist" />
      {/* ambient sky glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-sky/25 blur-[120px]" />

      <div className="relative mx-auto max-w-content px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow justify-center">{t.experiencesSection.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 font-display text-4xl font-light md:text-6xl">
              {t.experiencesSection.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-slate md:text-lg">{t.experiencesSection.subtitle}</p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {experiences.map((exp, i) => {
            const tx = t.experiences[i];
            return (
              <Reveal key={i} delay={(i % 4) * 0.06}>
                <div className="glass h-full rounded-sm p-7 transition-all duration-300 hover:border-azure/40 hover:shadow-lift">
                  <exp.icon size={30} className="text-azure" strokeWidth={1.3} />
                  <h3 className="mt-5 font-display text-xl font-normal">{tx.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate">{tx.copy}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-14 text-center">
            <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
              {t.experiencesSection.cta}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
