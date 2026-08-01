"use client";

// Masked line/word/char text reveal, the premium "type rises into view" tell.
// GSAP SplitText (free in GSAP 3.13+) with mask wrappers for the clip effect.
// Honors prefers-reduced-motion (renders plain text, no animation).
import { useRef, useEffect, type ReactNode, type ElementType } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

export function SplitReveal({
  children,
  as: Tag = "span",
  by = "lines",
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  by?: "lines" | "words" | "chars";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let split: SplitText | null = null;
    const ctx = gsap.context(() => {
      split = new SplitText(el, { type: by, mask: by });
      const targets =
        by === "chars" ? split.chars : by === "words" ? split.words : split.lines;
      gsap.fromTo(
        targets,
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: "power4.out",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        },
      );
    });
    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [by]);

  const Comp = Tag as ElementType;
  return (
    <Comp ref={ref} className={className}>
      {children}
    </Comp>
  );
}
