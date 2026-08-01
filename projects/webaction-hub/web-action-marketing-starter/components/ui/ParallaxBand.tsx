"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Full-bleed cinematic photo band with a parallax drift. Optional centered
 * eyebrow + line of copy. Used to feature the most striking villa shots.
 */
export function ParallaxBand({
  image,
  eyebrow,
  title,
  className = "h-[75vh]",
}: {
  image: string;
  eyebrow?: string;
  title?: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-14%", "14%"]);

  return (
    <section ref={ref} className={cn("relative w-full overflow-hidden", className)}>
      <motion.div style={{ y: reduce ? 0 : y }} className="absolute inset-[-14%]">
        <Image src={image} alt={title || ""} fill sizes="100vw" quality={90} className="object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-ink/40" />
      <div className="absolute inset-0 vignette" />

      {(eyebrow || title) && (
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-shadow-hero">
          {eyebrow && (
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              className="text-[0.7rem] uppercase tracking-luxe text-white/85"
            >
              {eyebrow}
            </motion.span>
          )}
          {title && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.1 }}
              className="mt-5 max-w-3xl font-display text-3xl font-light leading-snug text-white md:text-5xl"
            >
              {title}
            </motion.p>
          )}
        </div>
      )}
    </section>
  );
}
