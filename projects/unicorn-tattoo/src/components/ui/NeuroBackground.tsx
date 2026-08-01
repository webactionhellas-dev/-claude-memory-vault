'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

// Paper Shaders' NeuroNoise - an organic, web-like field of glowing lines.
// Loaded client-only (WebGL, no SSR) so it never blocks first paint.
const NeuroNoise = dynamic(
  () => import('@paper-design/shaders-react').then((m) => m.NeuroNoise),
  { ssr: false }
);

type Overlay = 'soft' | 'strong' | 'none';

// A gradient veil painted over the shader so it reads as depth behind the
// content rather than a foreground pattern - matched to the ink palette.
const OVERLAY: Record<Overlay, string> = {
  soft: 'bg-gradient-to-b from-ink/50 via-ink/25 to-ink/70',
  strong: 'bg-gradient-to-b from-ink-900/85 via-ink-900/60 to-ink-900',
  none: ''
};

interface Props {
  className?: string;
  /** Canvas opacity (0-1). Default 0.55. */
  opacity?: number;
  /** Animation speed. Default 0.4. Set 0 to hold still. */
  speed?: number;
  /** Zoom of the field. Default 1.3. */
  scale?: number;
  /** Gradient veil over the shader. Default 'soft'. */
  overlay?: Overlay;
}

/**
 * Ambient teal NeuroNoise field for section backgrounds. It:
 *  - respects prefers-reduced-motion (renders nothing when reduced),
 *  - pauses when scrolled out of view (speed -> 0),
 *  - nudges the Paper shader to re-measure until the canvas has real size.
 * Absolutely positioned - drop it as the first child of a `relative` section.
 */
export default function NeuroBackground({
  className,
  opacity,
  speed,
  scale,
  overlay = 'soft'
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState(false);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    setMotion(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // The shader canvas can mount at 0x0 inside an absolutely-positioned box;
  // poll briefly and hand the Paper mount the parent's real dimensions.
  useEffect(() => {
    if (!motion) return;
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    let tries = 0;
    const ready = () => {
      const c = el.querySelector('canvas');
      return !!c && c.width > 0 && c.height > 0;
    };
    const kick = () => {
      const host = el.querySelector('[data-paper-shader]') as
        | (HTMLElement & { paperShaderMount?: Record<string, unknown> & { handleResize?: () => void } })
        | null;
      const mount = host?.paperShaderMount;
      if (host && mount) {
        const r = host.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          mount.parentWidth = r.width;
          mount.parentHeight = r.height;
          mount.devicePixelsSupported = false;
          mount.handleResize?.();
        }
      }
    };
    const loop = () => {
      if (!ready()) {
        kick();
        if (++tries < 40) timer = window.setTimeout(loop, 120);
      }
    };
    const ro = new ResizeObserver(() => {
      tries = 0;
      window.clearTimeout(timer);
      loop();
    });
    ro.observe(el);
    timer = window.setTimeout(loop, 80);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, [motion]);

  // Pause the animation while off-screen.
  useEffect(() => {
    if (!motion) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries[0].isIntersecting),
      { rootMargin: '120px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [motion]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {motion && (
        <NeuroNoise
          colorBack="#060606"
          colorMid="#123A44"
          colorFront="#2E96B0"
          brightness={0.9}
          contrast={0.32}
          speed={inView ? (speed ?? 0.4) : 0}
          scale={scale ?? 1.3}
          style={{ position: 'absolute', inset: 0, opacity: opacity ?? 0.55 }}
        />
      )}
      {overlay !== 'none' && <div className={cn('absolute inset-0', OVERLAY[overlay])} />}
    </div>
  );
}
