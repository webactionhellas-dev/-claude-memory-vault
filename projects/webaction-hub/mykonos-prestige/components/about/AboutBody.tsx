"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { about, villas, site } from "@/lib/data";
import { useLang } from "@/components/LanguageProvider";
import { Reveal } from "@/components/ui/Reveal";
import { ImageReveal } from "@/components/ui/ImageReveal";
import { AboutHero } from "@/components/about/AboutHero";

export function AboutBody() {
  const { t } = useLang();
  const a = t.aboutPage;

  return (
    <main>
      <AboutHero image={about.heroImage} eyebrow={a.eyebrow} title={a.title} />

      {/* Lede + story */}
      <section className="section bg-whisper">
        <div className="mx-auto max-w-content px-6 lg:px-10">
          <Reveal>
            <p className="mx-auto max-w-3xl text-center font-display text-2xl font-light leading-relaxed text-aegean md:text-3xl md:leading-relaxed">
              {a.lede}
            </p>
          </Reveal>

          <div className="mt-16 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <ImageReveal className="relative aspect-[4/5] rounded-sm shadow-lift">
              <Image
                src={villas[0].photos[2]}
                alt={t.villas.thalassa.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                quality={90}
                className="object-cover"
              />
            </ImageReveal>
            <div className="space-y-5">
              {a.story.map((p, i) => (
                <Reveal key={i} delay={0.08 * i}>
                  <p className="text-slate md:text-lg md:leading-relaxed">{p}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-mist py-16">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-8 px-6 text-center lg:grid-cols-4 lg:px-10">
          {about.stats.map((s, i) => (
            <Reveal key={s.value} delay={i * 0.06}>
              <p className="font-display text-4xl font-light text-azure md:text-5xl">{s.value}</p>
              <p className="mt-2 text-[0.68rem] uppercase tracking-wide2 text-slate">{a.statLabels[i]}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="section bg-white">
        <div className="mx-auto max-w-content px-6 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <span className="eyebrow justify-center">{a.valuesEyebrow}</span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 font-display text-4xl font-light md:text-5xl">{a.valuesTitle}</h2>
            </Reveal>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {a.values.map((v, i) => (
              <Reveal key={v.title} delay={(i % 4) * 0.06}>
                <div className="glass h-full rounded-sm p-7">
                  <p className="font-display text-xl text-aegean">{v.title}</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate">{v.copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* The two villas */}
      <section className="section bg-mist">
        <div className="mx-auto max-w-content px-6 lg:px-10">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Reveal>
              <span className="eyebrow justify-center">{a.estatesEyebrow}</span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 font-display text-4xl font-light md:text-5xl">{a.estatesTitle}</h2>
            </Reveal>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {villas.map((v, i) => (
              <Reveal key={v.id} delay={i * 0.08}>
                <Link href={`/villas/${v.id}`} className="group block">
                  <ImageReveal className="relative aspect-[16/11] rounded-sm shadow-soft" delay={i * 0.08}>
                    <Image
                      src={v.heroImage}
                      alt={t.villas[v.id].name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      quality={90}
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-7 text-white">
                      <p className="text-[0.68rem] uppercase tracking-wide2 text-sky">{t.villas[v.id].subtitle}</p>
                      <h3 className="mt-2 font-display text-3xl font-light text-white">{t.villas[v.id].name}</h3>
                      <span className="mt-3 inline-flex items-center gap-2 text-sm text-white/85 transition-colors group-hover:text-white">
                        {a.explore} <ArrowRight size={15} />
                      </span>
                    </div>
                  </ImageReveal>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-mist py-24 text-ink">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky/25 blur-[130px]" />
        <div className="relative mx-auto max-w-content px-6 text-center lg:px-10">
          <Reveal>
            <h2 className="mx-auto max-w-3xl font-display text-4xl font-light md:text-5xl">{a.comeStay}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-9 flex justify-center">
              <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                {t.cta.reserveStay}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
