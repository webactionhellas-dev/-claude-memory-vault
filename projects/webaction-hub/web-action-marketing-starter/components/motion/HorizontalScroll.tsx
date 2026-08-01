"use client";

// Pinned horizontal scroll: the vertical scroll drives a horizontal track. The
// signature "gallery slides sideways as you scroll down" move. Nested reveals
// inside should use containerAnimation (see motion.md). Honors reduced-motion
// (falls back to a normal horizontally-scrollable row).
import { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function HorizontalScroll({
  children,
  className,
  snap = false,
}: {
  children: ReactNode;
  className?: string;
  snap?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapEl = wrap.current;
    const trackEl = track.current;
    if (!wrapEl || !trackEl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wrapEl.style.overflowX = "auto"; // usable fallback: native horizontal scroll
      return;
    }
    const panels = trackEl.children.length;
    const ctx = gsap.context(() => {
      gsap.to(trackEl, {
        x: () => -(trackEl.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: wrapEl,
          pin: true,
          scrub: 1,
          end: () => "+=" + (trackEl.scrollWidth - window.innerWidth),
          invalidateOnRefresh: true,
          snap: snap && panels > 1 ? 1 / (panels - 1) : undefined,
        },
      });
    }, wrapEl);
    return () => ctx.revert();
  }, [snap]);

  return (
    <div ref={wrap} className={className} style={{ overflow: "hidden" }}>
      <div ref={track} style={{ display: "flex", flexWrap: "nowrap", willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}
