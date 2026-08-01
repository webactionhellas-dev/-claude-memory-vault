"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useLang } from "@/components/LanguageProvider";

export function PageHero({
  image,
  eyebrow,
  title,
  subtitle,
  pageKey,
}: {
  image: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  pageKey?: "experiences" | "gallery";
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { t } = useLang();
  // When a pageKey is given, use the localized strings; otherwise fall back to props.
  const c = pageKey ? t.pages[pageKey] : { eyebrow, title, subtitle };
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[560px] w-full overflow-hidden">
      <motion.div style={{ scale: reduce ? 1 : scale, y: reduce ? 0 : y }} className="absolute inset-0">
        <Image src={image} alt={c.title} fill priority sizes="100vw" quality={90} className="object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-ink/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-ink/40" />
      <div className="absolute inset-0 vignette" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-shadow-hero">
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mb-6 text-[0.7rem] uppercase tracking-luxe text-white/85"
        >
          {c.eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl font-display text-4xl font-extralight leading-[1.08] text-white sm:text-6xl md:text-7xl"
        >
          {c.title}
        </motion.h1>
        {c.subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.6 }}
            className="mt-7 max-w-xl text-base font-light text-white/85 md:text-lg"
          >
            {c.subtitle}
          </motion.p>
        )}
      </div>
    </section>
  );
}
