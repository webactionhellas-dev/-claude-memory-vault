"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/language-provider";
import { howItWorks } from "@/lib/data";
import { Icon } from "@/components/icon";
import { SectionHeading } from "@/components/section-heading";
import { RevealGroup, itemVariants } from "@/components/reveal";

export function HowItWorks({ index }: { index?: string }) {
  const { t, tr } = useLanguage();
  return (
    <section id="how" className="section bg-sunken">
      <div className="container">
        <SectionHeading
          index={index}
          eyebrow={t.sections.howEyebrow}
          title={t.sections.howTitle}
          subtitle={t.sections.howSubtitle}
        />
        <RevealGroup className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* connecting line on large screens */}
          <div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent lg:block" />
          {howItWorks.map((step, i) => (
            <motion.div key={i} variants={itemVariants} className="relative text-center">
              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-card text-primary shadow-soft">
                <Icon name={step.icon} className="h-6 w-6" />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-xs font-bold text-gold-foreground">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-5 font-serif text-lg font-semibold text-foreground">{tr(step.title)}</h3>
              <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
                {tr(step.text)}
              </p>
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
