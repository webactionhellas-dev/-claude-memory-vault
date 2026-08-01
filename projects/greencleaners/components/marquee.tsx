"use client";

import { cn } from "@/lib/utils";

/** Seamless infinite marquee. The row is duplicated so the loop is gapless. */
export function Marquee({
  items,
  reverse = false,
  className,
}: {
  items: string[];
  reverse?: boolean;
  className?: string;
}) {
  const row = [...items, ...items];
  return (
    <div className={cn("mask-fade-x w-full overflow-hidden", className)}>
      <div
        className={cn(
          "flex w-max items-center gap-0",
          reverse ? "motion-safe:animate-marquee-reverse" : "motion-safe:animate-marquee",
        )}
      >
        {row.map((item, i) => (
          <span key={i} className="flex items-center whitespace-nowrap">
            <span className="font-serif text-2xl italic tracking-tight text-primary-foreground/90 sm:text-3xl">
              {item}
            </span>
            <svg
              viewBox="0 0 24 24"
              className="mx-7 h-3.5 w-3.5 shrink-0 text-gold sm:mx-9"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2c1.5 4 4.5 7 8.5 8.5-4 1.5-7 4.5-8.5 8.5-1.5-4-4.5-7-8.5-8.5C7.5 9 10.5 6 12 2Z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
