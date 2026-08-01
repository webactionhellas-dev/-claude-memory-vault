'use client';

import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Direction = 'up' | 'down' | 'none';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** transition duration in seconds (default 0.9) */
  duration?: number;
  y?: number;
  direction?: Direction;
  as?: 'div' | 'section' | 'span' | 'li' | 'h2' | 'p';
}

/**
 * Scroll-triggered reveal WITHOUT framer-motion - IntersectionObserver plus a
 * CSS transition. Reveal renders on every page, so keeping framer out of it
 * keeps the ~70 kB (gz) library off the shared bundle; framer now ships only
 * with the home-page sections that need scroll-linked transforms.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.9,
  y = 28,
  direction = 'up',
  as = 'div'
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const offset = direction === 'down' ? -y : direction === 'none' ? 0 : y;
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  return createElement(
    as,
    {
      ref,
      className: cn(className),
      style: {
        opacity: shown ? 1 : 0,
        transform: shown || offset === 0 ? 'none' : `translateY(${offset}px)`,
        filter: shown ? 'blur(0px)' : 'blur(6px)',
        transition: `opacity ${duration}s ${ease} ${delay}s, transform ${duration}s ${ease} ${delay}s, filter ${duration}s ${ease} ${delay}s`
      }
    },
    children
  );
}
