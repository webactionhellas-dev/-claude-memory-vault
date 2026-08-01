'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Cycles a small set of words in place with a soft cross-fade. Every word is
 * stacked in one grid cell (.rotw) so the row never reflows. Respects
 * prefers-reduced-motion (holds on the first word).
 */
export default function RotatingWord({
  words,
  interval = 2200,
  className
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const id = window.setInterval(() => setI((p) => (p + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [words.length, interval]);

  return (
    <span className={cn('rotw', className)}>
      {words.map((w, idx) => (
        <span
          key={w}
          aria-hidden={idx !== i}
          style={{
            opacity: idx === i ? 1 : 0,
            transform: idx === i ? 'translateY(0)' : 'translateY(0.5em)'
          }}
        >
          {w}
        </span>
      ))}
    </span>
  );
}
