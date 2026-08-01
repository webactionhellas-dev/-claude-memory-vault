"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Photo } from "@/components/photo";
import { Reveal, RevealGroup, itemVariants } from "@/components/reveal";
import { images } from "@/lib/images";

export function EcoSection() {
  const { t, lang } = useLanguage();

  const bullets =
    lang === "el"
      ? [
          "Οικολογικός διαλύτης K.W.L., φιλικός προς το δέρμα",
          "Ατομικό πλύσιμο & απολύμανση σε κουβέρτες και παπλώματα",
          "Λιγότερο νερό και ενέργεια ανά κύκλο",
          "Χωρίς έντονες χημικές οσμές",
        ]
      : [
          "K.W.L. ecological solvent, gentle on the skin",
          "Individual washing & disinfection for blankets and comforters",
          "Less water and energy per cycle",
          "No harsh chemical odours",
        ];

  return (
    <section id="eco" className="section relative overflow-hidden">
      <div className="aurora -left-24 top-10 h-72 w-72 bg-sage/40" />
      <div className="container relative grid items-center gap-14 lg:grid-cols-2">
        <Reveal className="order-2 lg:order-1">
          <span className="eyebrow">{t.sections.ecoEyebrow}</span>
          <h2 className="display mt-3 text-[clamp(1.9rem,4.5vw,3rem)] text-foreground">
            {t.sections.ecoTitle}
          </h2>

          {/* Editorial pull quote */}
          <blockquote className="relative mt-6 border-l-2 border-gold/50 pl-5">
            <span className="absolute -left-1 -top-5 select-none font-serif text-5xl leading-none text-gold/30">
              &ldquo;
            </span>
            <p className="font-serif text-xl italic leading-relaxed text-foreground/90 sm:text-2xl">
              {t.sections.ecoText}
            </p>
          </blockquote>

          <RevealGroup className="mt-8 grid gap-3 sm:grid-cols-2">
            {bullets.map((b) => (
              <motion.div key={b} variants={itemVariants} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-foreground/85">{b}</span>
              </motion.div>
            ))}
          </RevealGroup>
        </Reveal>

        <Reveal delay={0.1} className="order-1 lg:order-2">
          <div className="relative">
            <Photo
              src={images.eco}
              alt={lang === "el" ? "Οικολογικός καθαρισμός" : "Ecological cleaning"}
              className="aspect-[5/4] w-full rounded-[2rem] shadow-lift"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {/* K.W.L. seal badge */}
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-border/60 bg-card px-6 py-5 shadow-lift sm:block">
              <p className="font-serif text-4xl font-semibold text-primary">K.W.L.</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {lang === "el" ? "οικολογικός διαλύτης" : "eco solvent"}
              </p>
            </div>
            <div className="absolute -right-4 -top-4 hidden h-20 w-20 rounded-2xl border border-gold/30 bg-gold/10 sm:flex sm:items-center sm:justify-center">
              <span className="font-serif text-2xl font-semibold text-gold">100%</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
