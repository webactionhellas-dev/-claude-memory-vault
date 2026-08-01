"use client";

import Image from "next/image";
import { Instagram, Mail, MessageCircle, MapPin } from "lucide-react";
import { site } from "@/lib/data";
import { navFor } from "@/lib/i18n";
import { useLang } from "./LanguageProvider";

export function Footer() {
  const waLink = `https://wa.me/${site.whatsapp}`;
  const { t, locale } = useLang();
  const nav = navFor(locale);

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-mist to-sky-soft text-ink">
      {/* Footer body */}
      <div className="mx-auto max-w-content px-6 py-16 lg:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Image
              src="/media/real/logo-ink.svg"
              alt={site.name}
              width={210}
              height={52}
              className="h-10 w-auto"
            />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate">
              {t.footer.tagline}
            </p>
          </div>

          <div>
            <h4 className="text-[0.68rem] uppercase tracking-luxe text-azure-deep">{t.footer.explore}</h4>
            <ul className="mt-5 space-y-3">
              {nav.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="text-sm text-slate transition hover:text-azure-deep">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[0.68rem] uppercase tracking-luxe text-azure-deep">{t.footer.contact}</h4>
            <ul className="mt-5 space-y-4 text-sm text-slate">
              <li>
                <a href={`mailto:${site.email}`} className="flex items-start gap-3 transition hover:text-azure-deep">
                  <Mail size={16} className="mt-0.5 shrink-0 text-azure" />
                  {site.email}
                </a>
              </li>
              <li>
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 transition hover:text-azure-deep">
                  <MessageCircle size={16} className="mt-0.5 shrink-0 text-azure" />
                  {site.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 transition hover:text-azure-deep">
                  <Instagram size={16} className="mt-0.5 shrink-0 text-azure" />
                  {site.instagramHandle}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 shrink-0 text-azure" />
                {site.address}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/60 pt-8 text-xs text-slate md:flex-row">
          <p>
            {t.footer.rights
              .replace("{year}", String(new Date().getFullYear()))
              .replace("{name}", site.name)}
          </p>
          <p className="tracking-wide2">{t.footer.location}</p>
        </div>
      </div>
    </footer>
  );
}
