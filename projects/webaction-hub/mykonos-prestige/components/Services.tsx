"use client";

import { services } from "@/lib/data";
import { Reveal } from "./ui/Reveal";
import { useLang } from "./LanguageProvider";

export function Services({ bg = "bg-white" }: { bg?: string }) {
  const { t } = useLang();
  return (
    <section id="services" className={`section ${bg}`}>
      <div className="mx-auto max-w-content px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow justify-center">{t.servicesSection.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 font-display text-4xl font-light md:text-5xl">{t.servicesSection.title}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-slate">{t.servicesSection.subtitle}</p>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {services.map((s, i) => (
            <Reveal key={s.label} delay={(i % 7) * 0.04}>
              <div className="group flex h-full flex-col items-center gap-3 rounded-sm border border-haze bg-whisper p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-azure/40 hover:shadow-soft">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-soft transition-colors group-hover:bg-sky">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/media/services/${s.icon}.svg`} alt="" className="h-6 w-6 opacity-75" />
                </span>
                <span className="text-xs leading-tight text-ink/80">{t.services[i]}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
