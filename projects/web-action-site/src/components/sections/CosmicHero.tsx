import { motion, useScroll, useTransform, type Variants } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/LanguageProvider'

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.35, staggerChildren: 0.14 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export function CosmicHero() {
  const { c } = useI18n()
  const heroRef = useRef<HTMLElement>(null)

  // Lightweight, GPU-only scroll animation: the whole hero fades + drifts as a
  // single composited layer over the first ~460px of scroll. We animate ONLY
  // opacity + transform (scale/translate) — no blur, filter, backdrop-filter,
  // mask, or per-frame repaint — so it stays at 60fps on low-powered phones.
  const { scrollY } = useScroll()
  const fade = useTransform(scrollY, [0, 460], [1, 0])
  const scale = useTransform(scrollY, [0, 460], [1, 0.96])
  const drift = useTransform(scrollY, [0, 460], [0, 80])
  const cueOpacity = useTransform(scrollY, [0, 140], [1, 0])

  return (
    <section ref={heroRef} id="top" className="relative min-h-[100svh] w-full overflow-hidden">
      {/* The entire hero scene (planet + content) animates as one GPU layer. */}
      <motion.div
        style={{ opacity: fade, scale, y: drift }}
        className="absolute inset-0 transform-gpu will-change-[transform,opacity]"
      >
        {/* the planet — a pre-masked transparent PNG that sits straight on the
            shared starfield. Its own soft atmosphere edge blends it in, so there
            is no scroll-linked mask or parallax (the old perf killers). */}
        <img
          src="/earth-new.webp?v=1"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          draggable={false}
          className="pointer-events-none absolute bottom-0 left-1/2 w-[min(165vw,1700px)] max-w-none -translate-x-1/2 translate-y-[16%] select-none"
        />

        {/* gentle center darkening for logo legibility — a static gradient (no blur) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(42% 30% at 50% 38%, rgba(0,0,0,0.45) 0%, transparent 75%)',
          }}
        />

        {/* SEO / a11y heading */}
        <h1 className="sr-only">Web Action. {c.hero.subtitle}</h1>

        {/* centered brand content */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 pb-[26vh] text-center">
          <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col items-center">
            {/* the company logo — the centerpiece */}
            <motion.img
              variants={item}
              src="/logo.webp?v=9"
              alt="Web Action, Web & App Development"
              width={1103}
              height={524}
              fetchPriority="high"
              decoding="async"
              draggable={false}
              className="w-[min(82vw,440px)] transform-gpu select-none drop-shadow-[0_10px_50px_rgba(51,102,255,0.45)]"
            />

            {/* brand subtitle */}
            <motion.div
              variants={item}
              className="mt-5 transform-gpu text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-foreground/70 sm:text-sm"
            >
              Web &amp; App Development
            </motion.div>

            {/* CTAs */}
            <motion.div
              variants={item}
              className="mt-11 flex w-full max-w-md transform-gpu flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4"
            >
              <Button
                asChild
                size="lg"
                variant="primary"
                className="group w-full gap-2 rounded-full px-8 text-sm uppercase tracking-[0.18em] sm:w-auto"
              >
                <a href="#contact">
                  {c.hero.ctaPrimary}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full rounded-full border-white/15 bg-white/10 px-8 text-sm uppercase tracking-[0.18em] sm:w-auto"
              >
                <a href="#services">{c.hero.ctaSecondary}</a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* scroll cue — outside the fading layer so it can fade on its own quick curve */}
      <motion.a
        href="#services"
        aria-label={c.hero.scroll}
        style={{ opacity: cueOpacity }}
        className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-[0.6rem] uppercase tracking-[0.4em] text-foreground/45 transition-colors hover:text-foreground"
      >
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.5 }}>
          <span className="block">{c.hero.scroll}</span>
          <ChevronDown className="mx-auto mt-1 h-4 w-4 animate-bounce" />
        </motion.span>
      </motion.a>
    </section>
  )
}
