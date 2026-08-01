"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import type { Villa } from "@/lib/data";
import { useLang } from "@/components/LanguageProvider";

export function VillaHero({ villa }: { villa: Villa }) {
  const { t } = useLang();
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  // One high-quality 1080p source everywhere (the title intro was trimmed out,
  // so there is no baked text to crop on mobile, and no quality drop on narrow
  // windows). Just make autoplay robust.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const tryPlay = () => {
      const p = v.play();
      if (p) p.catch(() => {});
    };
    tryPlay();
    v.addEventListener("canplay", tryPlay, { once: true });
    return () => v.removeEventListener("canplay", tryPlay);
  }, []);

  return (
    <section ref={ref} className="relative h-[100svh] w-full overflow-hidden">
      <motion.div style={{ scale: reduce ? 1 : scale, y: reduce ? 0 : y }} className="absolute inset-0">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={`/media/real/${villa.id}_poster.webp`}
        >
          <source src={villa.video} type="video/webm" />
        </video>
      </motion.div>

      {/* Scrim: darker toward the bottom-left where the name sits */}
      <div className="absolute inset-0 bg-ink/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/15" />
      <div className="absolute inset-0 vignette" />

      {/* Villa name only, bottom-left — always visible, gentle entrance */}
      <div className="relative z-10 flex h-full flex-col items-start justify-end px-6 pb-14 text-shadow-hero sm:px-10 lg:px-16 lg:pb-20">
        <motion.h1
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-left font-display text-[3.2rem] font-light leading-[0.95] text-white sm:text-6xl md:text-7xl lg:text-8xl"
        >
          {t.villas[villa.id].name}
        </motion.h1>
      </div>
    </section>
  );
}
