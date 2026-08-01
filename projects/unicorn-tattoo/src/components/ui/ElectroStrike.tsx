import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * "Electro Strike" - the glowing electric strike UI component from Mike's
 * spec sheet (artwork extracted from the sheet itself, blacks leveled and
 * edges faded so it composites cleanly). Rendered with `mix-blend-mode:
 * screen`, so over any dark surface only the glow paints - use it for
 * dividers, accents, or energetic moments like the Zeus storm.
 *
 * Variants:
 *   horizontal   - the "Glow Intense" crackle band
 *   vertical     - the "Default" strike turned vertical (high-res main bolt)
 *   vertical-alt - the sheet's true "Vertical" bolt (thinner, softer)
 */
export const STRIKE_SRC = {
  horizontal: '/images/fx/strike-h.webp',
  vertical: '/images/fx/strike-v1.webp',
  'vertical-alt': '/images/fx/strike-v2.webp'
} as const;

export type ElectroStrikeVariant = keyof typeof STRIKE_SRC;

export default function ElectroStrike({
  variant = 'horizontal',
  className,
  style
}: {
  variant?: ElectroStrikeVariant;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={STRIKE_SRC[variant]}
      alt=""
      aria-hidden="true"
      className={cn('pointer-events-none max-w-none select-none', className)}
      style={{ mixBlendMode: 'screen', ...style }}
    />
  );
}
