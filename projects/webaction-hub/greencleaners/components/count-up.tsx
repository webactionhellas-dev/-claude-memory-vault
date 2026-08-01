"use client";

import * as React from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Counts from 0 to `to` once it scrolls into view. */
export function CountUp({
  to,
  prefix = "",
  suffix = "",
  duration = 1.2,
  className,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduced]);

  return (
    <span ref={ref} className={cn("tnum", className)}>
      {prefix}
      {Math.round(value)}
      {suffix}
    </span>
  );
}
