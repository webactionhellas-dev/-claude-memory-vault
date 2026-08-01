import { useRef } from 'react'
import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion'

import { Reveal } from '@/components/site/Reveal'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/LanguageProvider'

/**
 * The "how we build" process — sketch → code → result, stacked vertically in a
 * zig-zag (image right, left, right). Each step slides in from its own side as
 * you scroll, and a single progress bar fills as you move 1 → 2 → 3.
 */
export function ProcessSection() {
  const { c } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.7'],
  })
  const railFill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 })

  const steps = [
    {
      n: '01',
      img: '/logo-sketch.webp',
      w: 940,
      h: 793,
      label: c.showcase.sketchLabel,
      caption: c.showcase.sketchCaption,
      alt: 'Hand-drawn Web Action logo sketches in a notebook',
      imageRight: true,
      floating: true,
      frameless: true,
      glow: true,
      outline: true,
      imgClassName: 'mx-auto max-h-[360px] w-auto',
    },
    {
      n: '02',
      img: '/code.webp?v=3',
      w: 1140,
      h: 786,
      label: c.showcase.codeLabel,
      caption: c.showcase.codeCaption,
      alt: 'Web Action code in the editor',
      imageRight: false,
      floating: true,
      frameless: true,
      glow: true,
      outline: true,
      imgClassName: undefined,
    },
    {
      n: '03',
      img: '/result.webp?v=8',
      w: 1140,
      h: 786,
      label: c.showcase.siteLabel,
      caption: c.showcase.siteCaption,
      alt: 'The finished Web Action website on a monitor',
      imageRight: true,
      floating: true,
      frameless: true,
      glow: true,
      outline: true,
      imgClassName: undefined,
    },
  ]

  return (
    <section id="showcase" className="relative overflow-hidden pt-8 pb-24 lg:pt-12 lg:pb-28">
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal className="mb-14 max-w-2xl">
          <span className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            <span className="h-px w-8 bg-primary/60" /> {c.showcase.eyebrow}
          </span>
          <h2 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance md:text-5xl">
            {c.showcase.heading}
          </h2>
          <p className="mt-5 text-lg font-light leading-relaxed text-foreground/65">{c.showcase.body}</p>
        </Reveal>

        <div ref={ref} className="relative flex gap-6 sm:gap-10">
          {/* vertical scroll-reactive rail running beside the steps — fills 1 → 2 → 3 */}
          <div className="relative w-0.5 shrink-0 overflow-hidden rounded-full bg-border/40">
            <motion.div
              style={{ scaleY: railFill }}
              className="absolute inset-0 origin-top rounded-full bg-gradient-to-b from-primary via-accent to-primary"
            />
          </div>

          <div className="flex-1 space-y-28 lg:space-y-44">
            {steps.map((s) => (
              <ProcessStep key={s.n} {...s} />
            ))}
          </div>
        </div>

        <Reveal delay={0.15} className="mt-20 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center">
          <span className="font-display text-lg font-semibold text-foreground/85 sm:text-xl">{c.showcase.topLine}</span>
          <span className="hidden h-5 w-px bg-border sm:block" />
          <span className="font-display text-lg font-semibold text-foreground/85 sm:text-xl">{c.showcase.bottomLine}</span>
        </Reveal>
      </div>
    </section>
  )
}

function ProcessStep({
  n,
  img,
  w,
  h,
  label,
  caption,
  alt,
  imageRight,
  floating,
  frameless,
  glow,
  outline,
  imgClassName,
}: {
  n: string
  img: string
  w: number
  h: number
  label: string
  caption: string
  alt: string
  imageRight: boolean
  floating: boolean
  frameless: boolean
  glow: boolean
  outline: boolean
  imgClassName?: string
}) {
  const reduce = useReducedMotion()

  // soft edge-light around the device — a crisp white rim fading into a blue
  // glow that matches the site + a depth shadow. The actual filter lives in
  // `.device-outline` (index.css) so it can be lightened on mobile, where a
  // 5-layer drop-shadow repainting every scroll frame caused the jank.

  const media = frameless ? (
    <img
      src={img}
      alt={alt}
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      className={cn('h-auto w-full object-contain', outline ? 'device-outline' : 'drop-shadow-[0_34px_55px_rgba(0,0,0,0.6)]', imgClassName)}
    />
  ) : (
    <figure className="group relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50 ring-1 ring-white/5">
      <img
        src={img}
        alt={alt}
        width={w}
        height={h}
        loading="lazy"
        decoding="async"
        className={cn('h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]', imgClassName)}
      />
    </figure>
  )

  return (
    <motion.div
      // every step stays fully lit; the only motion is a gentle one-time fade-in
      // as it scrolls into view (kept on regardless of OS "reduce motion" so it
      // matches the rest of the site's reveals — it's a tiny one-shot, not loop)
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
    >
      {/* copy column */}
      <div className={cn('order-2', imageRight ? 'lg:order-1' : 'lg:order-2')}>
        <div className="flex items-center gap-4">
          <span className="font-display text-5xl font-extrabold tabular-nums text-primary md:text-6xl">{n}</span>
          <span className="h-px w-12 bg-primary/50" />
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-foreground/65">{label}</span>
        </div>
        <p className="mt-5 max-w-md text-lg font-light leading-relaxed text-foreground/80">{caption}</p>
      </div>

      {/* image column */}
      <div className={cn('relative order-1', imageRight ? 'lg:order-2' : 'lg:order-1')}>
        {/* soft blue light behind the device — always lit now */}
        {glow && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
          >
            <div className="h-[82%] w-[88%] rounded-full bg-primary/35 blur-[90px]" />
          </div>
        )}
        {/* each photo slides in from its own side + fades + lifts a touch as the
            step scrolls into view — one small entrance, GPU transform/opacity only */}
        <motion.div
          initial={{ opacity: 0, x: imageRight ? 56 : -56, scale: 0.94 }}
          whileInView={{ opacity: 1, x: 0, scale: 1 }}
          viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="transform-gpu will-change-[transform,opacity]"
        >
          {floating && !reduce ? (
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ repeat: Infinity, duration: 6.5, ease: 'easeInOut' }}
              className="will-change-transform"
            >
              {media}
            </motion.div>
          ) : (
            media
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
