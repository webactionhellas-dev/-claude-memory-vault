"use client";

// Magnetic hover: the element eases toward the cursor and springs back on leave.
// GSAP quickTo for cheap 60fps updates. Wrap a button or a link.
import { useRef, type ReactNode, type MouseEvent } from "react";
import { gsap } from "gsap";

export function MagneticButton({
  children,
  className,
  strength = 0.4,
  href,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
  href?: string;
}) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);

  function onMove(e: MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    gsap.to(el, {
      x: (e.clientX - (r.left + r.width / 2)) * strength,
      y: (e.clientY - (r.top + r.height / 2)) * strength,
      duration: 0.4,
      ease: "power3.out",
    });
  }

  function onLeave() {
    if (ref.current) gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  }

  const common = { ref, className, onMouseMove: onMove, onMouseLeave: onLeave };
  return href ? (
    <a href={href} {...common}>
      {children}
    </a>
  ) : (
    <button type="button" {...common}>
      {children}
    </button>
  );
}
