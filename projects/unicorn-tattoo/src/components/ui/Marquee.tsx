'use client';

import { cn } from '@/lib/utils';

/**
 * Seamless infinite marquee. The row holds two identical copies of the items
 * and slides translateX 0 → -50%, so the loop is gapless. Pauses on hover;
 * frozen under prefers-reduced-motion (handled globally in globals.css).
 */
export default function Marquee({
  items,
  className,
  reverse = false
}: {
  items: string[];
  className?: string;
  reverse?: boolean;
}) {
  const copy = (
    <div className="flex shrink-0 items-center gap-12 pr-12" aria-hidden="true">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-12 whitespace-nowrap">
          <span className="font-display text-[clamp(1.9rem,6vw,4.75rem)] uppercase leading-none text-bone/85">
            {item}
          </span>
          <span className="inline-block h-2 w-2 rotate-45 bg-violet" />
        </span>
      ))}
    </div>
  );

  return (
    <div className={cn('group/marquee relative flex overflow-hidden', className)}>
      <div
        className="flex w-max group-hover/marquee:[animation-play-state:paused]"
        style={{ animation: `marquee 30s linear infinite${reverse ? ' reverse' : ''}` }}
      >
        {copy}
        {copy}
      </div>
    </div>
  );
}
