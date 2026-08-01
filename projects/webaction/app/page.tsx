'use client'

import { SplineScene } from '@/components/ui/splite'
import { Card, CardContent } from '@/components/ui/card'
import { Spotlight, StaticSpotlight } from '@/components/ui/spotlight'
import { Typewriter } from '@/components/ui/typewriter'
import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { Meteors } from '@/components/ui/meteors'
import { Aurora } from '@/components/ui/aurora'
import { motion } from 'framer-motion'
import {
  Globe, Smartphone, Palette, Zap, Code2, BarChart3,
  ArrowRight, ExternalLink, ChevronDown, Layers, Shield, Clock, Check,
  Mail, MapPin,
} from 'lucide-react'

// Instagram SVG — not in this version of lucide-react
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}
import { useState } from 'react'
import { t, type Lang } from '@/lib/translations'

const INSTAGRAM = 'https://www.instagram.com/webactionhellas/'
const EMAIL     = 'webactionhellas@gmail.com'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.23, 1, 0.32, 1] },
  }),
}

const serviceIcons = [Globe, Smartphone, Palette, Zap, Code2, BarChart3]
const serviceGradients = [
  { gradient: 'from-indigo-500/20 to-blue-500/10',   border: 'hover:border-indigo-500/40' },
  { gradient: 'from-blue-500/20 to-cyan-500/10',      border: 'hover:border-blue-500/40'   },
  { gradient: 'from-violet-500/20 to-purple-500/10',  border: 'hover:border-violet-500/40' },
  { gradient: 'from-amber-500/20 to-orange-500/10',   border: 'hover:border-amber-500/40'  },
  { gradient: 'from-emerald-500/20 to-teal-500/10',   border: 'hover:border-emerald-500/40'},
  { gradient: 'from-rose-500/20 to-pink-500/10',      border: 'hover:border-rose-500/40'   },
]
const processIcons = [Layers, Palette, Code2, Zap]
const perkIcons    = [Clock, Shield, Globe, Check]

// ── Language Toggle ───────────────────────────────────────────
function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden text-xs font-semibold">
      {(['en', 'el'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1.5 transition-colors uppercase tracking-wider
            ${lang === l ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
        >
          {l === 'en' ? 'EN' : 'GR'}
        </button>
      ))}
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────
function Nav({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false)
  const tx = t[lang].nav
  const links = [
    { href: '#services', label: tx.services },
    { href: '#process',  label: tx.process  },
    { href: '#contact',  label: tx.contact  },
  ]
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-500/20">
            W&A
          </div>
          <span className="text-white font-semibold">Web<span className="text-indigo-400">Action</span></span>
        </a>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <LangToggle lang={lang} setLang={setLang} />
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-neutral-400 hover:text-pink-400 hover:border-pink-500/30 transition-all text-sm">
            <InstagramIcon className="w-3.5 h-3.5" />
          </a>
          <a href="#contact"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]">
            {tx.cta} <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <button className="md:hidden p-2 text-neutral-400" onClick={() => setOpen(!open)}
          aria-label="Toggle menu" aria-expanded={open}>
          <span className="block w-5 h-0.5 bg-current mb-1 transition-transform" style={{ transform: open ? 'rotate(45deg) translateY(6px)' : '' }} />
          <span className="block w-5 h-0.5 bg-current mb-1 transition-opacity" style={{ opacity: open ? 0 : 1 }} />
          <span className="block w-5 h-0.5 bg-current transition-transform" style={{ transform: open ? 'rotate(-45deg) translateY(-6px)' : '' }} />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-black/95 px-6 py-4 flex flex-col gap-2">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="py-3 text-sm text-neutral-300 border-b border-white/5">{l.label}</a>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <LangToggle lang={lang} setLang={setLang} />
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-neutral-400 hover:text-pink-400 transition-all text-sm">
              <InstagramIcon className="w-3.5 h-3.5" />
            </a>
          </div>
          <a href="#contact" onClick={() => setOpen(false)}
            className="mt-2 flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-600 text-white text-sm font-medium">
            {tx.cta} <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </header>
  )
}

// ── Hero ──────────────────────────────────────────────────────
function Hero({ lang }: { lang: Lang }) {
  const tx = t[lang].hero
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black pt-16">
      <Aurora />
      <StaticSpotlight className="-top-40 left-0 md:left-40 md:-top-20" fill="white" />
      <div className="mx-auto max-w-7xl px-6 w-full py-16">
        <div className="flex flex-col lg:flex-row items-center gap-12">

          {/* Copy */}
          <div className="flex-1 relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              {tx.badge}
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
              className="text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight text-white mb-6">
              {tx.h1a}{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
                {tx.h1b}
              </span>{' '}
              {tx.h1c}
            </motion.h1>

            {/* Typewriter cycling services */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center gap-2 mb-4 text-sm text-neutral-500">
              <span className="w-4 h-px bg-neutral-700" />
              <Typewriter
                words={lang === 'en'
                  ? ['Web Applications', 'Mobile Apps', 'UI/UX Design', 'Digital Strategy']
                  : ['Web Εφαρμογές', 'Mobile Apps', 'UI/UX Design', 'Ψηφιακή Στρατηγική']}
                className="text-indigo-400 font-medium"
              />
            </motion.div>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
              className="text-lg text-neutral-400 max-w-xl leading-relaxed mb-10">
              {tx.desc}
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-wrap gap-4 mb-12">
              <a href="#contact"
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold shadow-xl shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:scale-[1.03] active:scale-[0.98]">
                {tx.cta1} <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#services"
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium transition-all hover:border-white/20">
                {tx.cta2} <ExternalLink className="w-4 h-4 opacity-60" />
              </a>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}
              className="flex gap-8">
              {tx.stats.map(s => (
                <div key={s.label}>
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* 3D Spline */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }} className="flex-1 relative w-full">
            <Card className="w-full h-[460px] md:h-[520px] bg-black/60 border border-white/10 relative overflow-hidden rounded-2xl">
              <Spotlight size={500} />
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
              <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="w-full h-full" />
            </Card>
            <div className="absolute -inset-4 bg-indigo-600/15 blur-3xl rounded-full -z-10 pointer-events-none" />
          </motion.div>
        </div>
      </div>

      {/* Instagram badge — subtle floating link */}
      <motion.a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }}
        className="hidden lg:flex absolute right-6 bottom-20 items-center gap-2 px-3 py-2 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-300 text-xs font-medium hover:bg-pink-500/20 transition-all">
        <InstagramIcon className="w-3.5 h-3.5" />
        @webactionhellas
      </motion.a>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-600">
        <span className="text-xs tracking-widest uppercase">{t[lang].scroll}</span>
        <ChevronDown className="w-4 h-4 animate-bounce" />
      </div>
    </section>
  )
}

// ── Services ──────────────────────────────────────────────────
function Services({ lang }: { lang: Lang }) {
  const tx = t[lang].services
  return (
    <section id="services" className="py-28 bg-black">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="text-center mb-16">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-4">{tx.eyebrow}</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {tx.title1}{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">{tx.titleGrad}</span>
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto">{tx.desc}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tx.items.map((svc, i) => {
            const Icon = serviceIcons[i]
            const style = serviceGradients[i]
            return (
              <motion.div key={svc.title} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Card className={`h-full bg-zinc-950 border border-white/8 ${style.border} transition-all duration-300 hover:shadow-xl group cursor-default`}>
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.gradient} border border-white/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-2">{svc.title}</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">{svc.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Process ───────────────────────────────────────────────────
function Process({ lang }: { lang: Lang }) {
  const tx = t[lang].process
  return (
    <section id="process" className="py-28 bg-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-transparent to-transparent pointer-events-none" />
      <div className="mx-auto max-w-7xl px-6 relative">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-4">{tx.eyebrow}</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{tx.title}</h2>
          <p className="text-neutral-400 max-w-lg mx-auto">{tx.desc}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tx.steps.map((step, i) => {
            const Icon = processIcons[i]
            return (
              <motion.div key={step.num} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp} className="relative">
                {i < tx.steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-indigo-500/40 to-transparent z-10" />
                )}
                <div className="p-6 rounded-2xl border border-white/8 bg-black hover:border-indigo-500/30 transition-all h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-black text-indigo-500/40">{step.num}</span>
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-indigo-400" />
                    </div>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Why Us ────────────────────────────────────────────────────
function WhyUs({ lang }: { lang: Lang }) {
  const tx = t[lang].why
  return (
    <section className="py-28 bg-black">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative rounded-3xl border border-white/8 bg-zinc-950 overflow-hidden p-10 md:p-16">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/15 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-600/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-4">{tx.eyebrow}</p>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                {tx.title1}{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">{tx.titleGrad}</span>
              </h2>
              <p className="text-neutral-400 leading-relaxed">{tx.desc}</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {tx.perks.map((p, i) => {
                const Icon = perkIcons[i]
                return (
                  <motion.div key={p.title} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1">{p.title}</h4>
                      <p className="text-neutral-400 text-xs leading-relaxed">{p.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Tech Stack Marquee ───────────────────────────────────────
const techItems = [
  { label: 'Next.js',       icon: '▲' },
  { label: 'React',         icon: '⚛' },
  { label: 'TypeScript',    icon: '🔷' },
  { label: 'Tailwind CSS',  icon: '🎨' },
  { label: 'React Native',  icon: '📱' },
  { label: 'Node.js',       icon: '🟢' },
  { label: 'Figma',         icon: '🖌' },
  { label: 'PostgreSQL',    icon: '🐘' },
  { label: 'Supabase',      icon: '⚡' },
  { label: 'Stripe',        icon: '💳' },
  { label: 'Vercel',        icon: '▲' },
  { label: 'Flutter',       icon: '🦋' },
]

function TechStack({ lang }: { lang: Lang }) {
  return (
    <section className="py-16 bg-zinc-950 border-y border-white/5 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 mb-8">
        <p className="text-center text-xs text-neutral-600 uppercase tracking-widest">
          {lang === 'en' ? 'Technologies we work with' : 'Τεχνολογίες που χρησιμοποιούμε'}
        </p>
      </div>
      <InfiniteMovingCards items={techItems} speed="normal" direction="left" />
      <div className="mt-4">
        <InfiniteMovingCards items={[...techItems].reverse()} speed="slow" direction="right" />
      </div>
    </section>
  )
}

// ── Meteor CTA (replaces lamp) ────────────────────────────────
const ctaContent = {
  en: {
    eyebrow: "Let's work together",
    title: 'Ready to Start Your Project?',
    desc: "Great digital products start with a conversation. Tell us your idea and we'll bring it to life.",
    cta: 'Start a Project',
  },
  el: {
    eyebrow: 'Ας συνεργαστούμε',
    title: 'Έτοιμοι να ξεκινήσετε το Project σας;',
    desc: 'Τα καλύτερα ψηφιακά προϊόντα αρχίζουν με μια συζήτηση. Πείτε μας την ιδέα σας και θα τη ζωντανέψουμε.',
    cta: 'Ξεκινήστε ένα Project',
  },
}

function MeteorCTA({ lang }: { lang: Lang }) {
  const tx = ctaContent[lang]
  return (
    <section className="relative py-40 bg-black overflow-hidden border-y border-white/5">
      {/* Meteor shower */}
      <Meteors number={35} />

      {/* Central glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-violet-500/10 blur-[80px]" />
      </div>

      {/* Subtle top/bottom lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        >
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-5">
            {tx.eyebrow}
          </p>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6
            bg-clip-text text-transparent bg-gradient-to-br from-white via-neutral-200 to-neutral-400">
            {tx.title}
          </h2>
          <p className="text-neutral-400 text-lg leading-relaxed max-w-xl mx-auto mb-10">
            {tx.desc}
          </p>
          <a href="#contact"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl
              bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500
              text-white font-semibold text-base
              shadow-[0_0_40px_rgba(99,102,241,0.35)] hover:shadow-[0_0_60px_rgba(99,102,241,0.5)]
              transition-all duration-300 hover:scale-[1.04] active:scale-[0.98]">
            {tx.cta} <ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}

// ── Contact ───────────────────────────────────────────────────
function Contact({ lang }: { lang: Lang }) {
  const tx = t[lang].contact
  const f  = tx.form
  return (
    <section id="contact" className="py-28 bg-zinc-950 relative overflow-hidden">
      <BackgroundBeams />
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">

          {/* Left */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-4">{tx.eyebrow}</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {tx.title1}{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">{tx.titleGrad}</span>
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-10">{tx.desc}</p>

            <div className="space-y-5">
              {/* Email */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-0.5">{tx.email}</div>
                  <a href={`mailto:${EMAIL}`} className="text-white text-sm font-medium hover:text-indigo-400 transition-colors">
                    {EMAIL}
                  </a>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-0.5">{tx.location}</div>
                  <div className="text-white text-sm font-medium">Athens, Greece</div>
                </div>
              </div>

              {/* Instagram */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-pink-500/15 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <InstagramIcon className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-0.5">{tx.instagram}</div>
                  <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
                    className="text-pink-400 text-sm font-medium hover:text-pink-300 transition-colors flex items-center gap-1.5">
                    @webactionhellas <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}>
            <Card className="bg-zinc-900 border border-white/8">
              <CardContent className="p-8">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    {[f.fname, f.lname].map(ph => (
                      <div key={ph}>
                        <label className="text-xs text-neutral-400 mb-1.5 block">{ph}</label>
                        <input type="text" placeholder={ph}
                          className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-white/8 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/60 transition-colors" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1.5 block">{tx.email}</label>
                    <input type="email" placeholder={f.emailPh}
                      className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-white/8 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/60 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1.5 block">{f.service}</label>
                    <select className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-white/8 text-sm text-neutral-300 focus:outline-none focus:border-indigo-500/60 transition-colors appearance-none">
                      <option value="">{f.servicePh}</option>
                      {f.services.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1.5 block">{f.details}</label>
                    <textarea rows={4} placeholder={f.detailsPh}
                      className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-white/8 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/60 transition-colors resize-none" />
                  </div>
                  <button className="w-full py-3.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2">
                    {f.send} <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-center text-xs text-neutral-600">{f.note}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────
function Footer({ lang }: { lang: Lang }) {
  const tx = t[lang].footer
  return (
    <footer className="border-t border-white/5 bg-black pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2">
            <a href="#" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">W&A</div>
              <span className="text-white font-semibold">Web<span className="text-indigo-400">Action</span></span>
            </a>
            <p className="text-neutral-500 text-sm leading-relaxed max-w-xs mb-6">{tx.desc}</p>
            <div className="flex gap-3">
              {/* Email icon */}
              <a href={`mailto:${EMAIL}`}
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-neutral-400 hover:text-indigo-400 hover:bg-white/10 transition-all"
                aria-label="Email">
                <Mail className="w-4 h-4" />
              </a>
              {/* Instagram */}
              <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-neutral-400 hover:text-pink-400 hover:bg-white/10 transition-all"
                aria-label="Instagram @webactionhellas">
                <InstagramIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {tx.cols.map(col => (
            <div key={col.heading}>
              <h4 className="text-white font-semibold text-sm mb-4">{col.heading}</h4>
              <ul className="space-y-3">
                {col.links.map(l => (
                  <li key={l}><a href="#" className="text-neutral-500 text-sm hover:text-neutral-300 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-neutral-600 text-sm">{tx.copy}</p>
          <p className="text-neutral-600 text-sm">
            {tx.made} <span className="text-neutral-400">{tx.city}</span>
          </p>
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function Home() {
  const [lang, setLang] = useState<Lang>('en')
  return (
    <main className="bg-black min-h-screen">
      <Nav lang={lang} setLang={setLang} />
      <Hero lang={lang} />
      <TechStack lang={lang} />
      <Services lang={lang} />
      <Process lang={lang} />
      <WhyUs lang={lang} />
      <MeteorCTA lang={lang} />
      <Contact lang={lang} />
      <Footer lang={lang} />
    </main>
  )
}
