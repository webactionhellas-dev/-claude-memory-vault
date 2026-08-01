'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { usePathname } from '@/i18n/navigation';
import { registerLenis } from '@/lib/scroll-lock';

export default function SmoothScroll({
  children
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6
    });
    lenisRef.current = lenis;
    registerLenis(lenis);

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Recompute scroll bounds whenever content height changes (images loading,
    // route changes, masonry reflow) - otherwise Lenis keeps stale dimensions
    // and scrolling feels stuck.
    const ro = new ResizeObserver(() => lenis.resize());
    ro.observe(document.documentElement);
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      lenis.destroy();
      lenisRef.current = null;
      registerLenis(null);
    };
  }, []);

  // On client-side navigation: jump to top and re-measure after layout settles.
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    lenis.scrollTo(0, { immediate: true });
    lenis.resize();
    const t1 = setTimeout(() => lenis.resize(), 180);
    const t2 = setTimeout(() => lenis.resize(), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  return <>{children}</>;
}
