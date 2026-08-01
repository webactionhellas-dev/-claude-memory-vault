import { useEffect, useState } from 'react'
import { Menu, X, ArrowUpRight, Languages } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/brand/Logo'
import { useI18n } from '@/i18n/LanguageProvider'

export function Navbar() {
  const { c, lang, toggle } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  const links = [
    { href: '#services', label: c.nav.services },
    { href: '#studio', label: c.nav.studio },
    { href: '#contact', label: c.nav.contact },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled
          ? 'border-b border-border/60 bg-background/80 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      )}
    >
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a href="#top" aria-label="Web Action" className="shrink-0 transition-transform hover:scale-[1.02]">
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-9 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="group relative text-[0.8rem] font-medium uppercase tracking-[0.18em] text-foreground/65 transition-colors hover:text-foreground"
              >
                {l.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="group flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/70 transition-all hover:border-primary/70 hover:text-foreground"
            aria-label="Switch language"
          >
            <Languages className="h-3.5 w-3.5 text-primary transition-transform group-hover:rotate-12" />
            {lang === 'en' ? 'ΕΛ' : 'EN'}
          </button>

          <Button
            asChild
            variant="primary"
            className="hidden rounded-full px-5 text-xs uppercase tracking-[0.16em] sm:inline-flex"
          >
            <a href="#contact">
              {c.nav.start} <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>

          <button
            className="text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl lg:hidden">
          <ul className="flex flex-col px-6 py-4">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-sm font-medium uppercase tracking-[0.18em] text-foreground/80"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="pt-3">
              <Button asChild variant="primary" className="w-full rounded-full">
                <a href="#contact" onClick={() => setOpen(false)}>
                  {c.nav.start}
                </a>
              </Button>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
