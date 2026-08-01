"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink, Star } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { testimonials, reviewsMeta } from "@/lib/data";
import { SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/utils";

/** The four-colour Google "G" mark. */
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-3.9 6.8-9.7 6.8-17.4Z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.6 0-12.2-4.5-14.2-10.5l-7.6 5.9C5.9 42.5 14.2 48 24 48Z" />
      <path fill="#FBBC05" d="M9.8 28.3c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.6-5.9C.8 16.1 0 19.9 0 23.7s.8 7.6 2.2 10.5l7.6-5.9Z" />
      <path fill="#EA4335" d="M24 9.3c3.6 0 6.8 1.2 9.3 3.7l7-7C35.9 2.1 30.5 0 24 0 14.2 0 5.9 5.5 2.2 13.2l7.6 5.9C11.8 13.1 17.4 9.3 24 9.3Z" />
    </svg>
  );
}

export function Testimonials({ index: sectionIndex }: { index?: string }) {
  const { t, tr, lang } = useLanguage();
  const [index, setIndex] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const count = testimonials.length;

  const go = React.useCallback(
    (next: number) => {
      setDir(next > index || (index === count - 1 && next === 0) ? 1 : -1);
      setIndex(((next % count) + count) % count);
    },
    [index, count],
  );

  const [paused, setPaused] = React.useState(false);
  React.useEffect(() => {
    if (paused) return;
    const id = setInterval(() => go(index + 1), 6000);
    return () => clearInterval(id);
  }, [index, paused, go]);

  const active = testimonials[index];
  const hasNumbers = reviewsMeta.count > 0 && reviewsMeta.rating > 0;

  return (
    <section id="testimonials" className="section">
      <div className="container">
        <SectionHeading
          index={sectionIndex}
          eyebrow={t.sections.testimonialsEyebrow}
          title={t.sections.testimonialsTitle}
          subtitle={t.sections.testimonialsSubtitle}
        />

        {/* Google rating summary */}
        <div className="mt-8 flex justify-center">
          <a
            href={reviewsMeta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 rounded-full border border-border/70 bg-card px-5 py-2.5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
          >
            <GoogleG className="h-5 w-5" />
            <span className="text-sm font-semibold text-foreground">
              {hasNumbers ? reviewsMeta.rating.toFixed(1).replace(".", lang === "el" ? "," : ".") : "Google"}
            </span>
            <span className="flex gap-0.5 text-gold">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4" fill="currentColor" stroke="none" />
              ))}
            </span>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {hasNumbers
                ? `${reviewsMeta.count} ${lang === "el" ? "κριτικές" : "reviews"}`
                : lang === "el"
                  ? "Δείτε τις αξιολογήσεις μας στο Google"
                  : "See our reviews on Google"}
            </span>
            <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </a>
        </div>

        <div
          className="relative mx-auto mt-10 max-w-3xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div
            className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 shadow-soft sm:p-12"
            aria-live="polite"
          >
            <GoogleG className="absolute right-8 top-8 h-9 w-9 opacity-90" />
            <AnimatePresence mode="wait" custom={dir}>
              <motion.figure
                key={index}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="flex gap-1 text-gold">
                  {Array.from({ length: active.rating }).map((_, i) => (
                    <Star key={i} className="h-5 w-5" fill="currentColor" stroke="none" />
                  ))}
                </div>
                <blockquote className="mt-5 font-serif text-xl leading-relaxed text-foreground sm:text-2xl">
                  “{tr(active.quote)}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-serif text-lg font-semibold text-primary">
                    {active.name.charAt(0)}
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground">{active.name}</span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {tr(active.area)}
                      <span aria-hidden>·</span>
                      <GoogleG className="h-3.5 w-3.5" />
                      Google
                    </span>
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          <div className="mt-7 flex items-center justify-center gap-4">
            <button
              onClick={() => go(index - 1)}
              aria-label="Previous"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary shadow-soft transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  aria-label={`Go to review ${i + 1}`}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === index ? "w-6 bg-primary" : "w-2 bg-primary/25 hover:bg-primary/40",
                  )}
                />
              ))}
            </div>
            <button
              onClick={() => go(index + 1)}
              aria-label="Next"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary shadow-soft transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
