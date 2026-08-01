import { useState } from 'react'
import { Mail, MapPin, Check, ArrowRight } from 'lucide-react'

import { InstagramIcon } from '@/components/ui/InstagramIcon'

import { Reveal } from '@/components/site/Reveal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/LanguageProvider'

// delivers the form straight to the company inbox (see note below the component)
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/webactionhellas@gmail.com'

export function ContactSection() {
  const { c, lang } = useI18n()
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)
  const [need, setNeed] = useState(c.contact.needOptions[1])

  const sendingTxt = lang === 'el' ? 'Αποστολή…' : 'Sending…'
  const errorTxt =
    lang === 'el'
      ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά ή στείλτε μας email απευθείας.'
      : 'Something went wrong. Please try again, or email us directly.'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setSending(true)
    setError(false)
    try {
      const fd = new FormData(form)
      fd.set('need', need)
      fd.set('_subject', 'New project inquiry from the Web Action site')
      fd.set('_captcha', 'false')
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      })
      if (!res.ok) throw new Error('Request failed')
      setSent(true)
      form.reset()
    } catch {
      setError(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="contact" className="relative py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-start">
          <Reveal className="max-w-xl">
            <span className="inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
              <span className="h-px w-8 bg-primary/60" /> {c.contact.eyebrow}
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance md:text-5xl">
              {c.contact.title}
            </h2>
            <p className="mt-5 text-lg font-light text-foreground/65">{c.contact.intro}</p>

            <div className="mt-10 space-y-7">
              {[
                { icon: Mail, label: c.contact.emailLabel, value: 'webactionhellas@gmail.com', href: 'mailto:webactionhellas@gmail.com' },
                { icon: InstagramIcon, label: 'Instagram', value: '@webactionhellas', href: 'https://www.instagram.com/webactionhellas/' },
                { icon: MapPin, label: c.contact.locationLabel, value: c.contact.location },
              ].map((d) => (
                <div key={d.label} className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-primary/10 text-primary">
                    <d.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[0.65rem] uppercase tracking-[0.24em] text-foreground/50">{d.label}</div>
                    {d.href ? (
                      <a
                        href={d.href}
                        target={d.href.startsWith('http') ? '_blank' : undefined}
                        rel={d.href.startsWith('http') ? 'noreferrer' : undefined}
                        className="font-display text-lg font-semibold break-words transition-colors hover:text-primary sm:text-xl"
                      >
                        {d.value}
                      </a>
                    ) : (
                      <div className="font-display text-lg font-semibold break-words sm:text-xl">{d.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            {sent ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-3xl border border-border/60 bg-card p-10 text-center shadow-2xl shadow-black/50">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary">
                  <Check className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-display text-3xl font-bold">{c.contact.sentTitle}</h3>
                <p className="mt-3 max-w-sm text-foreground/60">{c.contact.sentBody}</p>
                <Button variant="outline" className="mt-8 rounded-full" onClick={() => setSent(false)}>
                  {c.contact.sendAnother}
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-border/60 bg-card p-7 shadow-2xl shadow-black/50 md:p-10"
              >
                {/* honeypot — bots fill this, real people never see it */}
                <input type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={c.contact.name} name="name" placeholder={c.contact.namePh} required />
                  <Field label={c.contact.email} name="email" type="email" placeholder={c.contact.emailPh} required />
                </div>
                <div className="mt-5">
                  <Field label={c.contact.company} name="company" placeholder={c.contact.companyPh} />
                </div>

                <Group label={c.contact.need}>
                  <div className="flex flex-wrap gap-2">
                    {c.contact.needOptions.map((s) => (
                      <Chip key={s} active={need === s} onClick={() => setNeed(s)}>{s}</Chip>
                    ))}
                  </div>
                </Group>

                <div className="mt-5">
                  <label className="mb-2 block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-foreground/55">
                    {c.contact.details}
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    required
                    placeholder={c.contact.detailsPh}
                    className="w-full resize-none rounded-xl border border-border/60 bg-navy-deep px-4 py-3 text-sm text-foreground placeholder:text-foreground/35 outline-none transition-colors focus:border-primary/70"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  variant="primary"
                  disabled={sending}
                  className="group mt-7 w-full rounded-full text-sm uppercase tracking-[0.18em] disabled:opacity-70"
                >
                  {sending ? sendingTxt : c.contact.send}
                  {!sending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </Button>
                {error && <p className="mt-4 text-center text-sm text-red-400">{errorTxt}</p>}
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-foreground/55">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border/60 bg-navy-deep px-4 py-3 text-sm text-foreground placeholder:text-foreground/35 outline-none transition-colors focus:border-primary/70"
      />
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-foreground/55">{label}</div>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-[0.72rem] uppercase tracking-[0.08em] transition-all hover:-translate-y-0.5',
        active
          ? 'border-primary bg-primary/15 text-foreground'
          : 'border-border/60 text-foreground/55 hover:border-border hover:text-foreground/80'
      )}
    >
      {children}
    </button>
  )
}
