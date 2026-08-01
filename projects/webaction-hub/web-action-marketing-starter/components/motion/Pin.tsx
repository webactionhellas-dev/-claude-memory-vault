"use client";

// Pin a section while the page scrolls a set distance past it, the base for
// chaptered scroll storytelling. Give it a distance (in viewport heights) the
// section stays fixed. Reduced-motion: renders normally (no pin). With Lenis the
// ticker wiring in SmoothScroll handles the scroll math, no proxy needed.
import { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function Pin({
  children,
  className,
  distance = 1, // viewport-heights to hold the pin
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: () => "+=" + window.innerHeight * distance,
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
      });
    }, el);
    return () => ctx.revert();
  }, [distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
