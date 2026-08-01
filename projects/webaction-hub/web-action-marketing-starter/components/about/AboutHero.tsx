"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

export function AboutHero({
  image,
  eyebrow,
  title,
}: {
  image: string;
  eyebrow: string;
  title: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  return (
    <section ref={ref} className="relative h-[100svh] w-full overflow-hidden">
      <motion.div style={{ scale: reduce ? 1 : scale, y: reduce ? 0 : y }} className="absolute inset-0">
        <Image src={image} alt={title} fill priority sizes="100vw" quality={90} className="object-cover" />
      </motion.div>
      {/* Cinematic scrim (no white fade) so the photo fills the whole hero */}
      <div className="absolute inset-0 bg-ink/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/15 to-ink/45" />
      <div className="absolute inset-0 vignette" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mb-6 text-[0.7rem] uppercase tracking-luxe text-white/80"
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl font-display text-4xl font-extralight leading-[1.08] text-white sm:text-6xl md:text-7xl"
        >
          {title}
        </motion.h1>
        <motion.span
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-8 block h-px w-24 origin-center bg-sky"
        />
      </div>
    </section>
  );
}
