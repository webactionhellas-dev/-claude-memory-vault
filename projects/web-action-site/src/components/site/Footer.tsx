import { ArrowUpRight, Mail, MapPin } from 'lucide-react'

import { InstagramIcon } from '@/components/ui/InstagramIcon'

import { Mark } from '@/components/brand/Logo'
import { Reveal } from '@/components/site/Reveal'
import { useI18n } from '@/i18n/LanguageProvider'

export function Footer() {
  const { c } = useI18n()

  return (
    <footer className="relative bg-navy-deep">
      {/* one subtle brand-blue thread instead of a hard divider line, so the
          page reads as a single continuous surface down into the footer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <Reveal className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1.2fr]">
          <div>
            <Mark className="h-16 w-auto" />
            <p className="mt-5 max-w-xs text-sm font-light leading-relaxed text-foreground/55">
              {c.footer.tagline}
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-foreground/45">
              {c.footer.explore}
            </h4>
            <ul className="space-y-3">
              {[
                { href: '#services', label: c.nav.services },
                { href: '#studio', label: c.nav.studio },
                { href: '#contact', label: c.nav.contact },
              ].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm text-foreground/70 transition-colors hover:text-primary">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-foreground/45">
              {c.footer.touch}
            </h4>
            <a
              href="mailto:webactionhellas@gmail.com"
              className="flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-primary"
            >
              <Mail className="h-4 w-4 text-primary" /> webactionhellas@gmail.com
            </a>
            <a
              href="https://www.instagram.com/webactionhellas/"
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-primary"
            >
              <InstagramIcon className="h-4 w-4 text-primary" /> @webactionhellas
            </a>
            <p className="mt-3 flex items-center gap-2 text-sm text-foreground/70">
              <MapPin className="h-4 w-4 text-primary" /> {c.contact.location}
            </p>
            <a
              href="#contact"
              className="group mt-6 inline-flex items-center gap-1 text-sm font-medium uppercase tracking-[0.16em] text-foreground"
            >
              {c.nav.start}
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </Reveal>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-7 text-xs text-foreground/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Web Action · W&amp;A. {c.footer.rights}</p>
          <p className="uppercase tracking-[0.2em]">Athens · Greece</p>
        </div>
      </div>
    </footer>
  )
}
