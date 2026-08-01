"use client";

// Custom cursor: a lagging dot driven by gsap.quickTo (GC-friendly, 60fps). The
// 0.3-0.5s lag between pointer and dot is what reads as expensive. Grows and
// inverts over any [data-cursor] target. Mount once near the root. Renders
// nothing (and leaves the native cursor) on touch devices or reduced-motion.
import { useRef, useEffect } from "react";
import { gsap } from "gsap";

export function CustomCursor({ size = 14 }: { size?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = ref.current;
    if (!dot) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coarse || reduce) return;

    dot.style.opacity = "1";
    const xTo = gsap.quickTo(dot, "x", { duration: 0.4, ease: "power3" });
    const yTo = gsap.quickTo(dot, "y", { duration: 0.4, ease: "power3" });
    const move = (e: PointerEvent) => { xTo(e.clientX); yTo(e.clientY); };
    const grow = () => gsap.to(dot, { scale: 2.4, duration: 0.3, ease: "power3.out" });
    const shrink = () => gsap.to(dot, { scale: 1, duration: 0.3, ease: "power3.out" });

    window.addEventListener("pointermove", move);
    const targets = document.querySelectorAll<HTMLElement>("[data-cursor]");
    targets.forEach((t) => { t.addEventListener("pointerenter", grow); t.addEventListener("pointerleave", shrink); });
    return () => {
      window.removeEventListener("pointermove", move);
      targets.forEach((t) => { t.removeEventListener("pointerenter", grow); t.removeEventListener("pointerleave", shrink); });
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: "50%",
        background: "currentColor",
        pointerEvents: "none",
        mixBlendMode: "difference",
        zIndex: 9999,
        opacity: 0,
      }}
    />
  );
}
