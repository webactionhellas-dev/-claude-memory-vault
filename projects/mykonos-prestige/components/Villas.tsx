"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, BedDouble, Users, Bath, Maximize, Waves, Check } from "lucide-react";
import { Reveal } from "./ui/Reveal";
import { useLang } from "./LanguageProvider";
import { villas, site, type Villa } from "@/lib/data";
import { cn } from "@/lib/utils";

/* ---- Per-villa image carousel ---- */
function Carousel({ villa }: { villa: Villa }) {
  const [idx, setIdx] = useState(0);
  const [, setDir] = useState(0);
  const { t } = useLang();
  const tv = t.villas[villa.id];
  const items = villa.gallery;

  const go = (d: 1 | -1) => {
    setDir(d);
    setIdx((p) => (p + d + items.length) % items.length);
  };

  const current = items[idx];

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm shadow-lift">
      {/* Instant switch, no crossfade */}
      <div className="absolute inset-0">
        {current.src && !current.placeholder ? (
          <Image
            src={current.src}
            alt={`${tv.name}, ${tv.galleryTags[idx] ?? "view"}`}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            quality={90}
            className="object-cover"
          />
        ) : (
          <div className="ph h-full w-full items-end justify-start">
            <span className="ph-tag">@mykonosprestigevillas · {tv.galleryTags[idx]}</span>
          </div>
        )}
      </div>

      {/* gradient strip so controls stay legible over any image */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/55 to-transparent" />

      {/* controls */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between p-4">
        <div className="flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDir(i > idx ? 1 : -1);
                setIdx(i);
              }}
              aria-label={`${idx + 1} / ${items.length}`}
              className={cn(
                "h-1 rounded-full transition-all",
                i === idx ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80",
              )}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => go(-1)}
            aria-label={t.a11y.closeMenu}
            className="rounded-full border border-white/40 bg-ink/40 p-2 text-white backdrop-blur-sm transition hover:bg-azure"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => go(1)}
            aria-label={t.a11y.openMenu}
            className="rounded-full border border-white/40 bg-ink/40 p-2 text-white backdrop-blur-sm transition hover:bg-azure"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Stat pill ---- */
function Stat({ icon: Icon, label }: { icon: typeof BedDouble; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-ink/85">
      <Icon size={18} className="text-azure" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/* ---- One villa block ---- */
function VillaShowcase({ villa, flip }: { villa: Villa; flip: boolean }) {
  const { t } = useLang();
  const tv = t.villas[villa.id];
  return (
    <div id={villa.id} className="scroll-mt-24">
      <div
        className={cn(
          "grid items-center gap-12 lg:grid-cols-2 lg:gap-16",
          flip && "lg:[direction:rtl]",
        )}
      >
        <Reveal className="lg:[direction:ltr]">
          <Carousel villa={villa} />
        </Reveal>

        <div className="lg:[direction:ltr]">
          <Reveal>
            <p className="text-[0.68rem] uppercase tracking-luxe text-azure">{tv.subtitle}</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h3 className="mt-3 font-display text-4xl font-light md:text-5xl">{tv.name}</h3>
            <p className="mt-2 text-sm italic text-slate">{tv.meaning}</p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Stat icon={Maximize} label={villa.size} />
              <Stat icon={BedDouble} label={`${villa.bedrooms} ${t.villaUnits.bedrooms}`} />
              <Stat icon={Users} label={`${villa.guests} ${t.villaUnits.guests}`} />
              <Stat icon={Bath} label={`${villa.baths} ${t.villaUnits.baths}`} />
              <Stat icon={Waves} label={tv.poolLength} />
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="mt-7 max-w-lg text-slate md:leading-relaxed">{tv.story}</p>
          </Reveal>

          <Reveal delay={0.2}>
            <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
              {tv.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-sm text-ink/80">
                  <Check size={16} className="mt-0.5 shrink-0 text-azure" />
                  {h}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.25}>
            <details className="group mt-7 border-t border-haze pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[0.72rem] uppercase tracking-wide2 text-slate transition hover:text-azure">
                {t.villaCommon.fullAmenities}
                <ChevronRight size={16} className="transition group-open:rotate-90" />
              </summary>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                {tv.amenities.map((a) => (
                  <span key={a} className="text-xs text-slate">· {a}</span>
                ))}
              </div>
            </details>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href={`/villas/${villa.id}`} className="btn-primary">
                {t.villaCommon.exploreVilla}
              </Link>
              <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
                {t.villaCommon.enquire}
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

export function Villas() {
  const { t } = useLang();
  return (
    <section className="section bg-white">
      <div className="mx-auto max-w-content px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow justify-center">{t.villasSection.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 font-display text-4xl font-light md:text-6xl">{t.villasSection.title}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-slate md:text-lg">{t.villasSection.subtitle}</p>
          </Reveal>
        </div>

        <div className="mt-20 flex flex-col gap-28">
          {villas.map((v, i) => (
            <VillaShowcase key={v.id} villa={v} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
