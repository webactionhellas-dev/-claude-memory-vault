"use client";

// Kinetic marquee: a seamless looping row whose speed and skew react to scroll
// velocity (the premium "type reacts to your scroll" tell). Reads Lenis velocity
// via window.__lenis; falls back to a steady loop if Lenis is absent. Honors
// reduced-motion (renders a static, non-animated row).
import { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "gsap";

export function Marquee({
  children,
  className,
  speed = 60, // px per second at rest
  repeat = 2,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
  repeat?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const row = el.firstElementChild as HTMLElement | null;
    if (!row) return;
    const width = row.offsetWidth;
    if (!width) return;

    let x = 0;
    const lenis = (window as unknown as { __lenis?: { velocity: number } }).__lenis;
    const tick = (_t: number, delta: number) => {
      const vel = lenis ? lenis.velocity : 0;
      const boost = 1 + Math.min(Math.abs(vel) / 12, 4); // scroll faster -> marquee faster
      x -= (speed * boost * delta) / 1000;
      if (x <= -width) x += width; // seamless wrap (children are duplicated)
      const skew = gsap.utils.clamp(-8, 8, vel * -0.4);
      gsap.set(el, { x, skewX: skew });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [speed]);

  return (
    <div style={{ overflow: "hidden", whiteSpace: "nowrap" }} className={className}>
      <div ref={ref} style={{ display: "inline-flex", willChange: "transform" }}>
        {Array.from({ length: Math.max(2, repeat) }).map((_, i) => (
          <div key={i} style={{ display: "inline-flex", flexShrink: 0 }} aria-hidden={i > 0}>
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
