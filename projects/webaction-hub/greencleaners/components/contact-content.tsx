"use client";

import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { BookingModal } from "@/components/booking-modal";
import { Button } from "@/components/ui/button";
import { Reveal, RevealGroup, itemVariants } from "@/components/reveal";
import { site } from "@/lib/site";
import { stores } from "@/lib/data";
import { telHref, whatsappHref } from "@/lib/utils";
import { motion } from "framer-motion";

export function ContactContent() {
  const { t, tr, lang } = useLanguage();
  const waMessage =
    lang === "el" ? "Γεια σας! Θα ήθελα πληροφορίες." : "Hello! I'd like some information.";

  const methods = [
    {
      icon: Phone,
      label: t.contact.phone,
      value: site.bookingPhone,
      href: telHref(site.bookingPhone),
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: site.whatsapp,
      href: whatsappHref(site.whatsapp, waMessage),
    },
    { icon: Mail, label: t.contact.email, value: site.email, href: `mailto:${site.email}` },
  ];

  return (
    <section className="pb-8 pt-2">
      <div className="container grid gap-10 lg:grid-cols-[1fr_1fr]">
        {/* Methods + booking */}
        <div>
          <RevealGroup className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {methods.map((m) => (
              <motion.a
                key={m.label}
                variants={itemVariants}
                href={m.href}
                target={m.label === "WhatsApp" ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lift"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <m.icon className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                    {m.label}
                  </span>
                  <span className="block font-semibold text-foreground">{m.value}</span>
                </span>
              </motion.a>
            ))}
          </RevealGroup>

          <Reveal delay={0.1}>
            <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                {t.contact.hours}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {lang === "el"
                  ? "Δευτέρα – Παρασκευή: 08:00 – 20:30"
                  : "Monday – Friday: 08:00 – 20:30"}
                <br />
                {lang === "el" ? "Σάββατο: 09:00 – 15:00" : "Saturday: 09:00 – 15:00"}
                <br />
                {lang === "el" ? "Κυριακή: Κλειστά" : "Sunday: Closed"}
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-6 rounded-2xl bg-primary p-6 text-primary-foreground shadow-soft">
              <h3 className="font-serif text-xl font-semibold">{t.contact.formTitle}</h3>
              <p className="mt-1 text-sm text-primary-foreground/80">{t.booking.subtitle}</p>
              <BookingModal>
                <Button size="lg" variant="gold" className="mt-4 w-full sm:w-auto">
                  {t.common.bookPickup}
                </Button>
              </BookingModal>
            </div>
          </Reveal>
        </div>

        {/* Stores quick list */}
        <Reveal delay={0.1}>
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8">
            <h3 className="font-serif text-xl font-semibold text-foreground">{t.footer.stores}</h3>
            <ul className="mt-5 divide-y divide-border/60">
              {stores.map((s) => (
                <li key={s.id} className="flex items-start gap-3 py-3.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="text-sm">
                    <span className="font-medium text-foreground">{tr(s.name)}</span>
                    <span className="block text-muted-foreground">{tr(s.address)}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3">
                      {s.phones.map((p) => (
                        <a key={p} href={telHref(p)} className="font-semibold text-primary hover:underline">
                          {p}
                        </a>
                      ))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
