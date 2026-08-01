"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Logo } from "@/components/logo";
import { site } from "@/lib/site";
import { stores } from "@/lib/data";
import { telHref } from "@/lib/utils";

export function Footer() {
  const { t, tr } = useLanguage();
  const year = new Date().getFullYear();

  const nav = [
    { href: "/ypiresies", label: t.nav.services },
    { href: "/times", label: t.nav.pricing },
    { href: "/katastimata", label: t.nav.stores },
    { href: "/pos-leitourgei", label: t.nav.how },
    { href: "/sxetika", label: t.nav.about },
    { href: "/epikoinonia", label: t.nav.contact },
  ];

  return (
    <footer className="border-t border-border/60 bg-primary text-primary-foreground">
      <div className="container grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:pr-6">
          <Logo variant="chip" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-primary-foreground/70">
            {t.footer.tagline}
          </p>
          <div className="mt-6 space-y-2 text-sm">
            <a href={telHref(site.bookingPhone)} className="flex items-center gap-2.5 text-primary-foreground/85 hover:text-gold">
              <Phone className="h-4 w-4" /> {site.bookingPhone}
            </a>
            <a href={`mailto:${site.email}`} className="flex items-center gap-2.5 text-primary-foreground/85 hover:text-gold">
              <Mail className="h-4 w-4" /> {site.email}
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">
            {t.footer.explore}
          </h3>
          <ul className="space-y-2.5 text-sm">
            {nav.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-primary-foreground/80 transition-colors hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">
            {t.footer.stores}
          </h3>
          <ul className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {stores.map((s) => (
              <li key={s.id} className="flex items-start gap-2.5 text-primary-foreground/80">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>
                  <span className="font-medium text-primary-foreground">{tr(s.name)}</span>
                  <br />
                  <a href={telHref(s.phones[0])} className="hover:text-gold">
                    {s.phones[0]}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-primary-foreground/60 sm:flex-row">
          <p>
            © {year} {site.name}. {t.footer.rights}
          </p>
          <p>{t.footer.built}</p>
        </div>
      </div>
    </footer>
  );
}
