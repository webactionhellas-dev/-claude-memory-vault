"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { pricing } from "@/lib/data";
import { SectionHeading } from "@/components/section-heading";
import { BookingModal } from "@/components/booking-modal";
import { Button } from "@/components/ui/button";
import { RevealGroup, itemVariants } from "@/components/reveal";

export function PricingTable({
  withHeading = true,
  index,
}: {
  withHeading?: boolean;
  index?: string;
}) {
  const { t, tr } = useLanguage();
  return (
    <section id="pricing" className="section bg-secondary/40">
      <div className="container">
        {withHeading && (
          <SectionHeading
            index={index}
            eyebrow={t.sections.pricingEyebrow}
            title={t.sections.pricingTitle}
            subtitle={t.sections.pricingSubtitle}
          />
        )}

        <RevealGroup className="mt-12 grid gap-6 md:grid-cols-2">
          {pricing.map((cat) => (
            <motion.div
              key={cat.id}
              variants={itemVariants}
              className="flex flex-col rounded-3xl border border-border/60 bg-card p-7 shadow-soft"
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-4">
                <h3 className="font-serif text-xl font-semibold text-foreground">{tr(cat.title)}</h3>
              </div>
              <ul className="mt-4 space-y-3">
                {cat.items.map((item) => (
                  <li key={item.name.el} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-foreground/85">{tr(item.name)}</span>
                    <span className="flex items-baseline gap-1 whitespace-nowrap font-semibold text-primary">
                      {item.price}
                      {item.unit && (
                        <span className="text-xs font-normal text-muted-foreground">{tr(item.unit)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {cat.note && (
                <p className="mt-5 flex items-start gap-2 rounded-xl bg-sage/20 px-3 py-2.5 text-xs leading-snug text-primary/90">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {tr(cat.note)}
                </p>
              )}
            </motion.div>
          ))}
        </RevealGroup>

        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="max-w-xl text-sm text-muted-foreground">{t.sections.pricingSubtitle}</p>
          <BookingModal>
            <Button size="lg">{t.common.bookPickup}</Button>
          </BookingModal>
        </div>
      </div>
    </section>
  );
}
