"use client";

import { MessageCircle, Phone } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { BookingModal } from "@/components/booking-modal";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/magnetic";
import { Reveal } from "@/components/reveal";
import { site } from "@/lib/site";
import { telHref, whatsappHref } from "@/lib/utils";

export function CtaSection() {
  const { t, lang } = useLanguage();
  const waMessage =
    lang === "el" ? "Γεια σας! Θα ήθελα πληροφορίες." : "Hello! I'd like some information.";

  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <div className="sheen dark-vignette relative overflow-hidden rounded-[2.5rem] bg-ink px-6 py-16 text-center text-ink-foreground shadow-lift noise sm:px-12 md:py-24">
            <div className="aurora -right-16 -top-16 h-72 w-72 bg-primary/40" />
            <div className="aurora -bottom-20 -left-10 h-72 w-72 bg-gold/20" style={{ animationDelay: "-8s" }} />

            <span className="eyebrow relative text-gold/80">
              {lang === "el" ? "Ξεκινήστε σήμερα" : "Get started today"}
            </span>
            <h2 className="display relative mx-auto mt-3 max-w-3xl text-[clamp(2rem,5vw,3.25rem)]">
              {t.sections.ctaTitle}
            </h2>
            <p className="relative mx-auto mt-5 max-w-xl text-ink-foreground/75 sm:text-lg">
              {t.sections.ctaSubtitle}
            </p>

            <div className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Magnetic>
                <BookingModal>
                  <Button size="xl" variant="gold">
                    {t.common.bookPickup}
                  </Button>
                </BookingModal>
              </Magnetic>
              <Button asChild size="xl" variant="whatsapp">
                <a href={whatsappHref(site.whatsapp, waMessage)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  {t.common.whatsapp}
                </a>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="border-ink-foreground/25 text-ink-foreground hover:bg-ink-foreground/10"
              >
                <a href={telHref(site.bookingPhone)}>
                  <Phone className="h-4 w-4" />
                  {site.bookingPhone}
                </a>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
