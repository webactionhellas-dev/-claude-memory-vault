"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { faqs } from "@/lib/data";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function Faq({ index }: { index?: string }) {
  const { t, tr } = useLanguage();
  return (
    <section id="faq" className="section bg-secondary/40">
      <div className="container max-w-3xl">
        <SectionHeading index={index} eyebrow={t.sections.faqEyebrow} title={t.sections.faqTitle} />
        <Reveal className="mt-10">
          <Accordion type="single" collapsible className="rounded-3xl border border-border/60 bg-card px-6 shadow-soft sm:px-8">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="last:border-0">
                <AccordionTrigger>{tr(f.q)}</AccordionTrigger>
                <AccordionContent>{tr(f.a)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
