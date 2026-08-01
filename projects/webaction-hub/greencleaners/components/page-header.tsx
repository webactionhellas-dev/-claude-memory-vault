"use client";

import { useLanguage } from "@/components/providers/language-provider";
import type { L } from "@/lib/data";
import { Reveal } from "@/components/reveal";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: L;
  title: L;
  subtitle?: L;
}) {
  const { tr } = useLanguage();
  return (
    <section className="relative overflow-hidden pt-36 pb-14 md:pt-44 md:pb-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-sage/30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary)/0.05)_1px,transparent_1px)] [background-size:26px_26px] opacity-60" />
      </div>
      <div className="container">
        <Reveal className="max-w-3xl">
          {eyebrow && <span className="eyebrow">{tr(eyebrow)}</span>}
          <h1 className="display mt-3 text-4xl text-foreground sm:text-5xl md:text-[3.25rem]">
            {tr(title)}
          </h1>
          {subtitle && (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
              {tr(subtitle)}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
