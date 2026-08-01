'use client';

import { useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';
import ElectroStrike, { STRIKE_SRC } from '@/components/ui/ElectroStrike';

/**
 * Diagonal electric storm BEHIND the Zeus photo. Fires exactly ONCE, in sync
 * with the photo's reveal: a teal backlight + two teal bolts rake DIAGONALLY
 * (top-right -> bottom-left) behind the photo (which sits in FRONT). The first
 * bolt flashes and fades; the SECOND bolt FREEZES and stays lit behind the
 * photo (zeus-freeze). No ambient repeats; reduced-motion = none.
 */

const BOLT_VARIANTS = ['vertical', 'vertical-alt'] as const;
// Nudge the sprite halo toward the brand teal (white-hot core barely moves).
const DIAG_FILTER = 'hue-rotate(-16deg) saturate(0.92)';

export default function ZeusLightning() {
  const ref = useRef<HTMLDivElement>(null);
  const [strike, setStrike] = useState(0);
  const boltRef = useRef({ variant: 0 });

  preload(STRIKE_SRC.vertical, { as: 'image' });
  preload(STRIKE_SRC['vertical-alt'], { as: 'image' });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    // ONE strike only, fired ~when the whole composition is materialising (0.9s)
    // so the studio text, the photo and the stripes all appear TOGETHER in one
    // smooth entrance. The storm is NOT inside the photo's fade (see
    // IntroTeaser), so both stripes are fully visible. No ambient - 2nd freezes.
    let fired = false;
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || fired) return;
        fired = true;
        io.disconnect();
        timer = window.setTimeout(() => {
          boltRef.current = { variant: Math.random() < 0.5 ? 0 : 1 };
          setStrike(1);
        }, 900);
      },
      { threshold: 0.05, rootMargin: '0px 0px -12% 0px' }
    );
    io.observe(el);

    return () => {
      window.clearTimeout(timer);
      io.disconnect();
    };
  }, []);

  const primary = BOLT_VARIANTS[boltRef.current.variant];
  const other = BOLT_VARIANTS[boltRef.current.variant === 0 ? 1 : 0];

  return (
    // Reaches past the photo on the top/sides so the diagonal bolts rake behind
    // and around it, but stops at the photo's bottom (bottom-0) so the frozen
    // stripe never bleeds down over the credit caption. z-0 = photo sits in front.
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute -inset-x-[20%] -top-[22%] bottom-0 z-0 overflow-hidden"
    >
      {strike > 0 && (
        <>
          {/* teal backlight behind the photo */}
          <div
            key={`flash-${strike}`}
            className="zeus-flash absolute inset-0 opacity-0"
            style={{
              mixBlendMode: 'screen',
              background:
                'radial-gradient(52% 50% at 50% 45%, rgba(70,183,206,0.5), rgba(46,150,176,0.2) 46%, transparent 72%)'
            }}
          />
          {/* two teal bolts rake DIAGONALLY top-right -> bottom-left (~38deg) */}
          <ElectroStrike
            key={`b1-${strike}`}
            variant={primary}
            className="zeus-bolt zeus-stroke-1 absolute left-[56%] top-1/2 opacity-0"
            style={{
              height: '132%',
              width: 'auto',
              transform: 'translate(-50%, -50%) rotate(38deg)',
              filter: DIAG_FILTER
            }}
          />
          <ElectroStrike
            key={`b2-${strike}`}
            variant={other}
            className="zeus-bolt zeus-freeze absolute left-[44%] top-1/2 opacity-0"
            style={{
              height: '128%',
              width: 'auto',
              transform: 'translate(-50%, -50%) rotate(42deg) scaleX(-1)',
              filter: DIAG_FILTER
            }}
          />
        </>
      )}
    </div>
  );
}
