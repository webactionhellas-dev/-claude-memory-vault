import { PenTool, Code2, Smartphone, ShoppingBag, Check, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

import { CosmicHero } from '@/components/sections/CosmicHero'
import { ContactSection } from '@/components/sections/ContactSection'
import { ProcessSection } from '@/components/sections/ProcessSection'
import { StarsBackground } from '@/components/ui/stars'
import { Reveal } from '@/components/site/Reveal'
import { useI18n } from '@/i18n/LanguageProvider'

const icons: Record<string, LucideIcon> = {
  design: PenTool,
  dev: Code2,
  apps: Smartphone,
  ecom: ShoppingBag,
}

export default function Home() {
  const { c } = useI18n()
  const reduce = useReducedMotion()

  // the floating phone mock-up — reused in two slots so the layout can differ by
  // breakpoint: on mobile it sits between the studio copy and the check-list, on
  // desktop it lives in the right column. Only one slot is visible at a time.
  const phoneEl = (
    <div className="relative flex justify-center">
      {/* soft brand glow behind the phone */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[68%] w-[64%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
      <motion.div
        animate={reduce ? undefined : { y: [0, -16, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        className="will-change-transform"
      >
        <img
          src="/phone.webp?v=4"
          alt="The Web Action site on mobile"
          width={1123}
          height={2496}
          loading="lazy"
          decoding="async"
          className="mx-auto h-auto w-full max-w-[270px] object-contain drop-shadow-[0_30px_55px_rgba(0,0,0,0.7)]"
        />
      </motion.div>
    </div>
  )

  return (
    <div>
      {/* ONE starfield behind the entire site. The hero is transparent and
          sits on top of it, so the cosmic background and every section below
          share the exact same drifting stars — no seams, no bridges. */}
      <StarsBackground
        starColor="#dfe8ff"
        className="pointer-events-none fixed inset-0 -z-10"
      />

      <CosmicHero />

      {/* services */}
      <section id="services" className="relative mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
        <Reveal className="mb-14 max-w-2xl">
          <span className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            <span className="h-px w-8 bg-primary/60" /> {c.services.eyebrow}
          </span>
          <h2 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance md:text-5xl">
            {c.services.heading}
          </h2>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {c.services.items.map((s, i) => {
            const Icon = icons[s.key] ?? Code2
            return (
              <Reveal key={s.key} delay={(i % 2) * 0.08}>
                <article className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-background p-8 shadow-[0_0_0_1px_rgba(51,102,255,0.1),0_0_30px_-14px_rgba(51,102,255,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_0_1px_rgba(51,102,255,0.25),0_0_40px_-12px_rgba(51,102,255,0.6)] md:p-10">
                  {/* hover glow */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        'radial-gradient(440px circle at 25% 0%, rgba(51,102,255,0.16), transparent 60%)',
                    }}
                  />
                  {/* index */}
                  <span className="absolute right-7 top-7 font-display text-sm font-semibold tabular-nums text-foreground/20 transition-colors duration-300 group-hover:text-primary/60">
                    0{i + 1}
                  </span>

                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/60 group-hover:bg-primary/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="relative mt-6 font-display text-2xl font-bold">{s.title}</h3>
                  <p className="relative mt-3 text-sm font-light leading-relaxed text-foreground/60">{s.blurb}</p>
                  {/* accent line grows on hover */}
                  <span className="relative mt-7 block h-px w-10 bg-primary/40 transition-all duration-500 group-hover:w-24 group-hover:bg-primary" />
                </article>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* process — sketch → code → result, revealed by one scroll animation */}
      <ProcessSection />

      {/* studio */}
      <section id="studio" className="relative py-24 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center lg:px-10">
          <Reveal>
            <span className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
              <span className="h-px w-8 bg-primary/60" /> {c.studio.eyebrow}
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
              {c.studio.heading}
            </h2>
            <p className="mt-6 max-w-xl text-lg font-light leading-relaxed text-foreground/65">
              {c.studio.body}
            </p>

            {/* phone sits here on mobile — before the check-list */}
            <div className="mt-10 lg:hidden">{phoneEl}</div>

            <ul className="mt-8 space-y-4">
              {c.studio.points.map((p) => (
                <li key={p} className="flex items-center gap-3.5 text-[0.95rem] font-medium text-foreground/85">
                  <Check className="h-[1.05rem] w-[1.05rem] shrink-0 text-primary" strokeWidth={2.75} />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>

          {/* phone in the right column — desktop only */}
          <Reveal delay={0.1} className="hidden lg:block">
            {phoneEl}
          </Reveal>
        </div>
      </section>

      <ContactSection />
    </div>
  )
}
