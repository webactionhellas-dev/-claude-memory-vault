"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { MagneticButton } from "./ui/MagneticButton";
import { useLang } from "./LanguageProvider";
import { site } from "@/lib/data";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const { t, locale } = useLang();
  // Greek words run much longer than English, so the headline uses smaller
  // steps in Greek to fit every breakpoint (esp. mobile) without clipping.
  const line1Size =
    locale === "el"
      ? "text-[2rem] sm:text-5xl md:text-6xl lg:text-[5rem]"
      : "text-[2.7rem] sm:text-6xl md:text-7xl lg:text-[6.6rem]";
  const line2Size =
    locale === "el"
      ? "text-[2.4rem] sm:text-6xl md:text-7xl lg:text-[6rem]"
      : "text-[3.4rem] sm:text-7xl md:text-8xl lg:text-[8.2rem]";

  // Cinematic parallax: content drifts up + fades as you scroll past the hero.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yContent = useTransform(scrollYProgress, [0, 1], ["0%", "38%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scaleVideo = useTransform(scrollYProgress, [0, 1], [1, 1.14]);

  // One consistent 1080p source everywhere; just make muted autoplay robust.
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
    <section id="top" ref={ref} className="relative h-[100svh] w-full overflow-hidden">
      {/* Background video */}
      <motion.div style={{ scale: reduce ? 1 : scaleVideo }} className="absolute inset-0">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/media/real/intro_poster.webp"
        >
          <source src="/media/real/intro.webm" type="video/webm" />
        </video>
      </motion.div>

      {/* Scrims: darken the whole video (hides the title baked into the source
          clip), soften behind the copy, then fade to whitewash below. */}
      <div className="absolute inset-0 bg-ink/35" />
      <div className="absolute inset-0 hero-scrim" />
      {/* Single pre-rendered, dithered veil (navy-top darkening + whitewash
          bottom). Baked C2-smooth curve + ~1 LSB dither => no gradient banding.
          No vignette here: its edge-darkening fought the whitewash at the seam. */}
      <div className="absolute inset-0 hero-veil-img" />

      {/* Content */}
      <motion.div
        style={{ y: reduce ? 0 : yContent, opacity: reduce ? 1 : opacity }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-shadow-hero"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mb-7 text-[0.7rem] uppercase tracking-luxe text-white/90"
        >
          {t.hero.eyebrow}
        </motion.p>

        <h1 className="font-display font-light uppercase leading-[0.98] tracking-[0.05em] text-white">
          <motion.span
            className={`block ${line1Size}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {t.hero.line1}
          </motion.span>
          <motion.span
            className={`mt-1 block ${line2Size}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.72, ease: [0.16, 1, 0.3, 1] }}
          >
            {t.hero.line2}
          </motion.span>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row"
        >
          <MagneticButton
            href={site.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost-light"
          >
            {t.cta.reserveStay}
          </MagneticButton>
          <MagneticButton href="#welcome" className="btn-ghost-light">
            {t.cta.discoverEstate}
          </MagneticButton>
        </motion.div>
      </motion.div>
    </section>
  );
}
