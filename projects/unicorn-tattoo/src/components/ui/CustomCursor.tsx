'use client';

import { useEffect, useRef } from 'react';

/**
 * Difference-blend dot + lagging ring. Desktop / fine-pointer only.
 * Adds `.has-cursor` to <html> so the native cursor hides; never runs on
 * touch devices or under prefers-reduced-motion.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    const root = document.documentElement;
    root.classList.add('has-cursor');

    const dot = dotRef.current!;
    const ring = ringRef.current!;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX - 3}px, ${mouseY - 3}px)`;
    };

    const interactiveSelector = 'a, button, [data-cursor="hover"], input, textarea, select';
    const onOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(interactiveSelector)) {
        ring.classList.add('is-hovering');
      }
    };
    const onOut = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(interactiveSelector)) {
        ring.classList.remove('is-hovering');
      }
    };

    let frame = 0;
    const loop = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      const size = ring.classList.contains('is-hovering') ? 29 : 18;
      ring.style.transform = `translate(${ringX - size}px, ${ringY - size}px)`;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);

    return () => {
      root.classList.remove('has-cursor');
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  );
}
