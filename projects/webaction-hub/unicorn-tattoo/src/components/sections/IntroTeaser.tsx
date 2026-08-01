'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import Reveal from '@/components/ui/Reveal';
import CountUp from '@/components/ui/CountUp';

export default function IntroTeaser() {
  const t = useTranslations('intro');
  const photoRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Gentle parallax on the portrait as the section enters, then it settles.
  const { scrollYProgress } = useScroll({
    target: photoRef,
    offset: ['start end', 'start center']
  });
  const y = useTransform(scrollYProgress, [0, 0.35], reduce ? ['0%', '0%'] : ['6%', '0%']);

  return (
    <section
      id="intro"
      className="relative overflow-hidden bg-ink edge mx-auto max-w-edge py-24 sm:py-40"
    >
      {/* 25th-anniversary badge, dissolved into the background as a watermark. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Image
          src="/brand/anniversary-25.png"
          alt=""
          aria-hidden="true"
          width={1254}
          height={1254}
          priority={false}
          className="h-auto w-[min(94%,720px)] opacity-[0.2] mix-blend-screen"
        />
      </div>

      <Reveal as="p" duration={1.1} className="relative z-10 eyebrow mb-10 flex items-center gap-3">
        <span className="inline-block h-px w-10 bg-violet" />
        {t('kicker')}
      </Reveal>

      <div className="relative z-10 grid gap-x-12 gap-y-14 md:grid-cols-12">
        <div className="flex flex-col md:col-span-7">
          <Reveal
            as="h2"
            delay={0.12}
            duration={1.2}
            className="font-display text-[clamp(2rem,5vw,4.25rem)] leading-[1.04] tracking-[-0.01em] text-bone text-balance"
          >
            {t('heading')}
          </Reveal>

          <Reveal delay={0.28} duration={1.2} className="mt-12 flex items-end gap-5 border-t border-white/8 pt-8">
            <CountUp to={25} suffix="+" className="font-display text-[clamp(4rem,9vw,7rem)] leading-[0.85] text-violet" />
            <span className="mb-2 max-w-[9rem] text-sm uppercase leading-snug tracking-kicker text-bone-dim">
              {t('statLabel')}
            </span>
          </Reveal>

          <Reveal delay={0.42} duration={1.2} as="p" className="mt-8 max-w-md text-base leading-relaxed text-bone-dim">
            {t('body')}
          </Reveal>
          <Reveal delay={0.56} duration={1.2} className="mt-8">
            <Link href="/about" className="ink-link text-sm uppercase tracking-kicker text-bone">
              {t('cta')} →
            </Link>
          </Reveal>
        </div>

        <div className="md:col-span-5">
          <Reveal delay={0.2} duration={1.2}>
            <div ref={photoRef} className="relative aspect-[4/5] overflow-hidden sm:aspect-[3/4]">
              <motion.div style={{ y }} className="absolute inset-[-10%]">
                <Image
                  src="/images/tattoo/intro-portrait.jpg"
                  alt="Fine-line portrait tattoo in progress at Unicorn Tattoo"
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover"
                />
              </motion.div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
