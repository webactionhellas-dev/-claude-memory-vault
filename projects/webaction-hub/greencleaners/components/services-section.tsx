"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { type Service } from "@/lib/data";
import { Icon } from "@/components/icon";
import { SectionHeading } from "@/components/section-heading";
import { RevealGroup, itemVariants } from "@/components/reveal";
import { cn } from "@/lib/utils";

/** Card that subtly tilts towards the cursor and lifts on hover. */
export function ServiceCard({
  service,
  href = "/ypiresies",
  big = false,
  index,
}: {
  service: Service;
  href?: string;
  big?: boolean;
  index?: number;
}) {
  const { tr, t } = useLanguage();
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sry = useSpring(ry, { stiffness: 200, damping: 18 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    ry.set(dx * 4);
    rx.set(-dy * 4);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      variants={itemVariants}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1000 }}
      className={cn(big && "sm:col-span-2 sm:row-span-2")}
    >
      <Link
        href={href}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card p-7 shadow-soft transition-all duration-300 hover:shadow-lift active:scale-[0.99]",
          big && "justify-end bg-gradient-to-br from-secondary via-card to-card p-8 md:p-10",
        )}
      >
        {/* index watermark */}
        {typeof index === "number" && (
          <span className="pointer-events-none absolute right-5 top-4 font-serif text-sm font-medium text-primary/25 tnum">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}

        <span
          className={cn(
            "flex items-center justify-center rounded-2xl bg-primary/8 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-active:bg-primary group-active:text-primary-foreground",
            big ? "h-16 w-16" : "h-14 w-14",
          )}
        >
          <Icon name={service.icon} className={big ? "h-8 w-8" : "h-7 w-7"} />
        </span>

        <div className={cn(big ? "mt-6" : "mt-5", big && "max-w-md")}>
          <h3 className={cn("font-serif font-semibold text-foreground", big ? "text-2xl md:text-3xl" : "text-xl")}>
            {tr(service.title)}
          </h3>
          <p className={cn("mt-2 leading-relaxed text-muted-foreground", big ? "text-base" : "text-sm")}>
            {big ? tr(service.description) : tr(service.short)}
          </p>
        </div>

        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          {t.common.learnMore}
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </Link>
    </motion.div>
  );
}

export function ServicesSection({
  items,
  withHeading = true,
  bento = false,
  index,
  className,
}: {
  items: Service[];
  withHeading?: boolean;
  bento?: boolean;
  index?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // Cursor-follow spotlight (bento only).
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <section id="services" className={cn("section", className)}>
      <div className="container">
        {withHeading && (
          <SectionHeading
            index={index}
            eyebrow={t.sections.servicesEyebrow}
            title={t.sections.servicesTitle}
            subtitle={t.sections.servicesSubtitle}
          />
        )}

        <div ref={wrapRef} onMouseMove={bento ? onMove : undefined} className="group/grid relative mt-12">
          {bento && (
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-2 -z-0 rounded-[2rem] opacity-0 transition-opacity duration-300 group-hover/grid:opacity-100"
              style={{
                background:
                  "radial-gradient(420px circle at var(--mx) var(--my), hsl(var(--primary) / 0.1), transparent 60%)",
              }}
            />
          )}
          <RevealGroup
            className={cn(
              "relative grid gap-6",
              bento ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3",
            )}
          >
            {items.map((s, i) => (
              <ServiceCard key={s.id} service={s} big={bento && i === 0} index={i} />
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
