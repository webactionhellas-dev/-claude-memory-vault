"use client";

// House smooth-scroll: Lenis driven by the GSAP ticker and synced to ScrollTrigger.
// Mount once in the root layout. Disabled under prefers-reduced-motion. Exposes
// window.__lenis so scroll-driven code can subscribe (Lenis swallows the native
// scroll event, so listen via lenis.on("scroll", ...), not window "scroll").
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      (window as unknown as { __lenis?: Lenis }).__lenis = undefined;
    };
  }, []);

  return null;
}
