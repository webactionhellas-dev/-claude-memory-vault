"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/language-provider";
import { pillars } from "@/lib/data";
import { Icon } from "@/components/icon";
import { RevealGroup, itemVariants } from "@/components/reveal";
import { cn } from "@/lib/utils";

export function Pillars() {
  const { tr } = useLanguage();
  return (
    <section className="relative z-10 -mt-6">
      <div className="container">
        <RevealGroup className="grid overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title.el}
              variants={itemVariants}
              className={cn(
                "group relative p-7 transition-colors hover:bg-secondary/40",
                "border-border/60",
                i !== 0 && "border-t sm:border-t-0",
                i % 2 === 1 && "sm:border-l",
                "lg:border-t-0",
                i !== 0 && "lg:border-l",
              )}
            >
              <span className="pointer-events-none absolute right-5 top-4 font-serif text-sm text-primary/25 tnum">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon name={p.icon} className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-serif text-lg font-semibold text-foreground">{tr(p.title)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tr(p.text)}</p>
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
