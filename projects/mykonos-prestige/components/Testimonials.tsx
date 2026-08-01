"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Reveal } from "./ui/Reveal";
import { useLang } from "./LanguageProvider";
import { cn } from "@/lib/utils";

export function Testimonials() {
  const { t } = useLang();
  const items = t.testimonials;
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % items.length), 6500);
    return () => clearInterval(id);
  }, [items.length]);

  const item = items[i % items.length];

  return (
    <section className="section relative overflow-hidden bg-mist">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.08]"
        style={{ backgroundImage: "url(/media/villas/thalassa/th_09.webp)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-mist via-mist/85 to-mist" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky/25 blur-[130px]" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <span className="eyebrow justify-center">{t.testimonialsSection.eyebrow}</span>
        </Reveal>

        <Quote className="mx-auto mt-8 text-azure/40" size={44} strokeWidth={1} />

        <div className="relative mt-4 min-h-[240px] sm:min-h-[190px]">
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="font-display text-2xl font-light leading-relaxed text-aegean md:text-[2rem] md:leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </p>
              <footer className="mt-8">
                <p className="text-sm uppercase tracking-wide2 text-azure">{item.author}</p>
                <p className="mt-1 text-xs text-slate">{item.origin}</p>
              </footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`${idx + 1} / ${items.length}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === i ? "w-7 bg-azure" : "w-1.5 bg-ink/20 hover:bg-ink/40",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
