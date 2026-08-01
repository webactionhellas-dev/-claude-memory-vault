"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { CountUp } from "@/components/count-up";
import { Seal } from "@/components/seal";
import { RevealGroup, itemVariants } from "@/components/reveal";
import { motion } from "framer-motion";

export function StatsBand() {
  const { lang } = useLanguage();

  const stats = [
    { to: 25, suffix: "+", label: { el: "Χρόνια εμπειρίας", en: "Years of experience" } },
    { to: 7, suffix: "", label: { el: "Καταστήματα", en: "Stores in Attica" } },
    { to: 48, suffix: "", labelEn: "h", label: { el: "Ώρες παράδοσης", en: "Hour turnaround" } },
    { to: 100, suffix: "%", label: { el: "Οικολογικός καθαρισμός", en: "Ecological cleaning" } },
  ];

  return (
    <section className="dark-vignette relative overflow-hidden bg-ink text-ink-foreground noise">
      {/* aurora glows */}
      <div className="aurora -left-20 top-0 h-72 w-72 bg-primary/40" />
      <div className="aurora -right-10 bottom-0 h-72 w-72 bg-gold/20" style={{ animationDelay: "-6s" }} />

      <div className="container relative py-16 md:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <RevealGroup className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div key={i} variants={itemVariants} className="text-center md:text-left">
                <div className="display text-gold-gradient text-5xl sm:text-6xl">
                  <CountUp
                    to={s.to}
                    suffix={lang === "en" && s.labelEn ? s.labelEn : s.suffix}
                  />
                </div>
                <div className="mt-2 h-px w-10 bg-gold/60 mx-auto md:mx-0" />
                <p className="mt-3 text-sm text-ink-foreground/65">
                  {lang === "el" ? s.label.el : s.label.en}
                </p>
              </motion.div>
            ))}
          </RevealGroup>

          <div className="hidden shrink-0 justify-self-center text-gold lg:block">
            <Seal className="w-40" />
          </div>
        </div>
      </div>
    </section>
  );
}
