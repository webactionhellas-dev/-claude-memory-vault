'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import MagneticButton from '@/components/ui/MagneticButton';
import HeroVideo from '@/components/ui/HeroVideo';
import HeroInkShader from '@/components/ui/HeroInkShader';
import HeroSpotlight from '@/components/ui/HeroSpotlight';
import RotatingWord from '@/components/ui/RotatingWord';
import { SITE } from '@/lib/content';

export default function Hero() {
  const t = useTranslations('hero');
  const ts = useTranslations('specialties');
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start']
  });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '18%']);
  const scale = useTransform(scrollYProgress, [0, 1], [1.02, reduce ? 1.02 : 1.16]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, reduce ? 1 : 0]);

  // Block-level reveal (kicker, logo, subtitle, disciplines, buttons)
  const reveal = {
    hidden: { opacity: 0, y: reduce ? 0 : 30, filter: 'blur(6px)' },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 1.1, delay: 0.2 + i * 0.13, ease: [0.22, 1, 0.36, 1] }
    })
  };

  // Per-character reveal for the studio name (film-title feel)
  const charReveal = {
    hidden: { opacity: 0, y: reduce ? 0 : '0.5em', filter: 'blur(8px)' },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.7, delay: 0.5 + i * 0.05, ease: [0.22, 1, 0.36, 1] }
    })
  };

  const name = SITE.name.toUpperCase();
  const disciplines = [
    ts('realisticTitle'),
    ts('graphicTitle'),
    ts('geometricTitle'),
    ts('letteringTitle')
  ];

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden"
    >
      {/* Full-bleed studio film: scroll parallax on the outer layer, a slow
          continuous "breathe" zoom on the inner layer (composes with parallax). */}
      <motion.div style={{ y, scale }} className="absolute inset-0 -z-10">
        <div className="hero-breathe absolute inset-0">
          <HeroVideo videoRef={videoRef} />
          {/* Subtle petrol-teal WebGL grade over the same film (desktop-gated). */}
          <HeroInkShader videoRef={videoRef} />
        </div>
        {/* Cinematic grading - darken edges symmetrically, keep the centre lit */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/55" />
        <div className="absolute inset-0 bg-[radial-gradient(110%_85%_at_50%_42%,transparent_30%,rgba(6,6,6,0.72)_100%)]" />
      </motion.div>

      {/* Pointer-follow light on the film (desktop / fine-pointer only) */}
      <HeroSpotlight />

      <motion.div
        style={{ opacity: fade }}
        className="edge relative z-[3] mx-auto flex w-full max-w-edge flex-col items-center py-32 text-center"
      >
        <motion.p
          custom={0}
          variants={reveal}
          initial="hidden"
          animate="show"
          className="eyebrow mb-9 flex items-center gap-3 text-bone"
        >
          <span className="inline-block h-px w-12 bg-magenta" />
          {t('kicker')}
          <span className="inline-block h-px w-12 bg-magenta" />
        </motion.p>

        <motion.div custom={1} variants={reveal} initial="hidden" animate="show">
          <Image
            src="/brand/logo.png"
            alt="Unicorn Ink, tattoos and more, est. 2001"
            width={800}
            height={566}
            priority
            sizes="(max-width: 768px) 72vw, 470px"
            className="h-auto w-[clamp(250px,36vw,470px)]"
          />
        </motion.div>

        {/* Studio name reveals letter by letter; words wrap as whole units */}
        <h1
          aria-label={SITE.name}
          className="mt-9 font-display text-[clamp(2rem,5.5vw,4rem)] uppercase leading-[0.95] tracking-[0.06em] text-bone"
        >
          <span aria-hidden="true" className="flex flex-wrap justify-center gap-x-[0.28em]">
            {(() => {
              let ci = 0;
              return name.split(' ').map((word, wi) => (
                <span key={wi} className="inline-flex whitespace-nowrap">
                  {word.split('').map((ch) => {
                    const idx = ci++;
                    return (
                      <motion.span
                        key={idx}
                        custom={idx}
                        variants={charReveal}
                        initial="hidden"
                        animate="show"
                        className="inline-block"
                      >
                        {ch}
                      </motion.span>
                    );
                  })}
                </span>
              ));
            })()}
          </span>
        </h1>

        <motion.p
          custom={3}
          variants={reveal}
          initial="hidden"
          animate="show"
          className="mt-3 text-[clamp(0.8rem,1.8vw,1.1rem)] uppercase tracking-[0.28em] text-bone-dim"
        >
          {t('titleLine1')} {t('titleLine2')}
        </motion.p>

        {/* Rotating real disciplines */}
        <motion.div
          custom={4}
          variants={reveal}
          initial="hidden"
          animate="show"
          className="mt-5 flex items-center justify-center gap-3"
        >
          <span className="inline-block h-px w-6 bg-violet/60" />
          <RotatingWord
            words={disciplines}
            className="text-center text-[11px] uppercase tracking-eyebrow text-bone"
          />
          <span className="inline-block h-px w-6 bg-violet/60" />
        </motion.div>

        <motion.div
          custom={5}
          variants={reveal}
          initial="hidden"
          animate="show"
          className="mt-11 flex flex-wrap items-center justify-center gap-4"
        >
          <MagneticButton href="#book" variant="solid" fx>
            {t('cta')}
          </MagneticButton>
          <MagneticButton href="#work" variant="outline" fx>
            {t('secondary')}
          </MagneticButton>
        </motion.div>
      </motion.div>
    </section>
  );
}
