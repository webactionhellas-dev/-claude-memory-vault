'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A soft light that follows the pointer across the hero and lifts the film
 * beneath it (mix-blend soft-light). Desktop / fine-pointer only, and disabled
 * for reduced-motion. Purely decorative, never intercepts pointer events.
 */
export default function HeroSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    setOn(true);
  }, []);

  useEffect(() => {
    if (!on) return;
    const el = ref.current;
    const section = el?.closest('section');
    if (!el || !section) return;

    let raf = 0;
    const move = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${x}%`);
        el.style.setProperty('--my', `${y}%`);
      });
    };
    const enter = () => (el.style.opacity = '1');
    const leave = () => (el.style.opacity = '0');

    section.addEventListener('mousemove', move);
    section.addEventListener('mouseenter', enter);
    section.addEventListener('mouseleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      section.removeEventListener('mousemove', move);
      section.removeEventListener('mouseenter', enter);
      section.removeEventListener('mouseleave', leave);
    };
  }, [on]);

  if (!on) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-500"
      style={
        {
          '--mx': '50%',
          '--my': '40%',
          mixBlendMode: 'soft-light',
          background:
            'radial-gradient(340px circle at var(--mx) var(--my), rgba(255,255,255,0.5), rgba(70,183,206,0.16) 42%, transparent 70%)'
        } as React.CSSProperties
      }
    />
  );
}
