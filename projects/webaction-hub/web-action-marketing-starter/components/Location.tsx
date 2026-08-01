"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { MapPin, Plane, Anchor, Wine } from "lucide-react";
import { Reveal } from "./ui/Reveal";
import { useLang } from "./LanguageProvider";
import { site } from "@/lib/data";

const pointIcons = [MapPin, Plane, Anchor, Wine];

export function Location() {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLang();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <section id="location" className="scroll-mt-24">
      {/* Full-bleed parallax panorama band */}
      <div ref={ref} className="relative h-[70vh] overflow-hidden">
        <motion.div style={{ y }} className="absolute inset-[-12%]">
          <Image
            src="/media/villas/thalassa/th_07.webp"
            alt="Panorama over Kastro, Mykonos"
            fill
            sizes="100vw"
            quality={90}
            className="object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-ink/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <Reveal>
            <span className="inline-flex items-center gap-3 text-[0.7rem] uppercase tracking-luxe text-white/90 before:block before:h-px before:w-8 before:bg-white/60">
              {t.location.eyebrow}
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 max-w-3xl font-display text-4xl font-light text-white md:text-6xl">
              {t.location.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-white/80">{t.location.subtitle}</p>
          </Reveal>
        </div>
      </div>

      {/* Map + distances */}
      <div className="bg-whisper py-20">
        <div className="mx-auto grid max-w-content items-center gap-12 px-6 lg:grid-cols-2 lg:px-10">
          <Reveal>
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm shadow-soft ring-1 ring-haze">
              {/* Keyless Google Maps embed. Swap the query for exact pin coords. */}
              <iframe
                title="Aegean House location"
                src="https://maps.google.com/maps?q=37.48358,25.32849&z=15&hl=en&output=embed"
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>

          <div>
            <Reveal>
              <h3 className="font-display text-3xl font-light md:text-4xl">{t.location.nearTitle}</h3>
            </Reveal>
            <div className="mt-8 divide-y divide-haze border-y border-haze">
              {t.location.points.map((p, i) => {
                const Icon = pointIcons[i];
                return (
                  <Reveal key={p.label} delay={i * 0.05}>
                    <div className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3.5">
                        <Icon size={19} className="text-azure" />
                        <span className="text-ink/85">{p.label}</span>
                      </div>
                      <span className="text-sm uppercase tracking-wide2 text-slate">{p.value}</span>
                    </div>
                  </Reveal>
                );
              })}
            </div>
            <Reveal delay={0.1}>
              <p className="mt-6 text-sm text-slate">{site.address}</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
