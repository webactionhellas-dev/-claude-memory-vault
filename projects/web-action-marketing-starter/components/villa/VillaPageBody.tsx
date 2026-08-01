"use client";

import Link from "next/link";
import { ArrowRight, Check, Maximize, BedDouble, Users, Bath, Waves } from "lucide-react";
import { villas, site } from "@/lib/data";
import { useLang } from "@/components/LanguageProvider";
import { Reveal } from "@/components/ui/Reveal";
import { ParallaxBand } from "@/components/ui/ParallaxBand";
import { Services } from "@/components/Services";
import { VillaHero } from "@/components/villa/VillaHero";
import { VillaGallery } from "@/components/villa/VillaGallery";

export function VillaPageBody({ villaId }: { villaId: "thalassa" | "anemos" }) {
  const { t } = useLang();
  const villa = villas.find((v) => v.id === villaId)!;
  const other = villas.find((v) => v.id !== villaId)!;
  const tv = t.villas[villaId];
  const tvOther = t.villas[other.id];
  const vp = t.villaPage;

  const stats = [
    { icon: Maximize, label: villa.size },
    { icon: BedDouble, label: `${villa.bedrooms} ${t.villaUnits.bedrooms}` },
    { icon: Users, label: `${villa.guests} ${t.villaUnits.guests}` },
    { icon: Bath, label: `${villa.baths} ${t.villaUnits.baths}` },
    { icon: Waves, label: tv.poolLength },
  ];

  return (
    <main>
      <VillaHero villa={villa} />

      {/* Overview */}
      <section className="section relative overflow-hidden bg-whisper">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${villa.photos[4]})` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-whisper/70 via-whisper/55 to-whisper/75" />
        <div className="relative mx-auto max-w-content px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <Reveal>
                <span className="eyebrow">{tv.meaning}</span>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="mt-6 font-display text-4xl font-light leading-tight md:text-5xl">
                  {vp.horizonPre} <span className="text-sea-gradient">{vp.horizonAccent}</span>
                </h2>
              </Reveal>
            </div>
            <div className="space-y-5">
              {tv.longStory.map((p, i) => (
                <Reveal key={i} delay={0.08 * i}>
                  <p className="text-slate md:text-lg md:leading-relaxed">{p}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={0.1}>
            <div className="mt-16 grid grid-cols-2 gap-6 border-y border-haze py-8 sm:grid-cols-3 lg:grid-cols-5">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <s.icon size={20} className="text-azure" />
                  <span className="text-sm text-ink/85">{s.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Spaces */}
      <section className="section bg-white pt-0">
        <div className="mx-auto max-w-content px-6 lg:px-10">
          <Reveal>
            <span className="eyebrow">{vp.spacesEyebrow}</span>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {tv.spaces.map((sp, i) => (
              <Reveal key={sp.name} delay={(i % 4) * 0.06}>
                <div className="glass h-full rounded-sm p-7">
                  <p className="font-display text-xl text-aegean">{sp.name}</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate">{sp.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Cinematic feature band */}
      <ParallaxBand image={villa.feature} eyebrow={tv.subtitle} title={tv.tagline} />

      {/* Gallery */}
      <section className="section bg-mist">
        <div className="mx-auto max-w-content px-6 lg:px-10">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Reveal>
              <span className="eyebrow justify-center">{vp.galleryEyebrow}</span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 font-display text-4xl font-light md:text-5xl">
                {vp.everyCornerOf} {tv.name}
              </h2>
            </Reveal>
          </div>
          <VillaGallery photos={villa.photos} name={tv.name} />
        </div>
      </section>

      {/* Amenities */}
      <section className="section relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.10]"
          style={{ backgroundImage: `url(${villa.photos[15]})` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-white/88 to-white" />
        <div className="relative mx-auto max-w-content px-6 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <Reveal>
                <span className="eyebrow">{vp.amenitiesEyebrow}</span>
                <h2 className="mt-6 font-display text-4xl font-light md:text-5xl">
                  {vp.everythingPre} <span className="text-sea-gradient">{vp.everythingAccent}</span>
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="mt-8 rounded-sm border border-haze bg-whisper p-6">
                  <p className="text-[0.68rem] uppercase tracking-luxe text-azure-deep">{vp.includedWithStay}</p>
                  <ul className="mt-4 space-y-2.5">
                    {vp.includedServices.map((s) => (
                      <li key={s} className="flex items-center gap-2.5 text-sm text-ink/85">
                        <Check size={16} className="shrink-0 text-azure" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {tv.amenities.map((a, i) => (
                <Reveal key={a} delay={(i % 6) * 0.04}>
                  <div className="flex items-start gap-3 border-b border-haze py-3 text-sm text-ink/80">
                    <Check size={16} className="mt-0.5 shrink-0 text-azure" />
                    {a}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <Services bg="bg-mist" />

      {/* Live location map */}
      <section className="relative">
        <div className="mx-auto max-w-content px-6 pt-4 lg:px-10">
          <Reveal>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <span className="eyebrow">{vp.locationEyebrow}</span>
                <h2 className="mt-4 font-display text-3xl font-light md:text-4xl">{vp.kastroMykonos}</h2>
              </div>
              <p className="hidden max-w-xs text-right text-sm text-slate md:block">{site.address}</p>
            </div>
          </Reveal>
        </div>
        <div className="h-[52vh] w-full overflow-hidden">
          <iframe
            title={`${tv.name} location on Google Maps`}
            src="https://maps.google.com/maps?q=37.48358,25.32849&z=15&hl=en&output=embed"
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      {/* CTA + cross-link */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-mist py-24 text-ink">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky/25 blur-[130px]" />
        <div className="relative mx-auto max-w-content px-6 text-center lg:px-10">
          <Reveal>
            <h2 className="mx-auto max-w-3xl font-display text-4xl font-light md:text-5xl">
              {vp.reservePre} {tv.name}
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mx-auto mt-5 max-w-xl text-slate">{vp.reserveSubtitle}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-4 text-[0.62rem] uppercase tracking-wide2 text-slate/70">
              {vp.greekReg} {villa.ama}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                {t.cta.reserveStay}
              </a>
              <Link href={`/villas/${other.id}`} className="btn-outline">
                {vp.discover} {tvOther.name} <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
