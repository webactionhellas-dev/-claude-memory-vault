'use client';

import { useEffect, useRef, useState } from 'react';

export default function CountUp({
  to,
  suffix = '',
  className
}: {
  to: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVal(to);
      return;
    }

    let raf = 0;
    let startTime = 0;
    const duration = 1600;

    const tick = (t: number) => {
      if (!startTime) startTime = t;
      const p = Math.min(1, (t - startTime) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          obs.disconnect();
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);

    return () => {
      obs.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <span ref={ref} className={className}>
      {val}
      {suffix}
    </span>
  );
}
