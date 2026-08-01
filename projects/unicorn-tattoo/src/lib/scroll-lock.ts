import type Lenis from 'lenis';

// SmoothScroll registers the live Lenis instance here so overlays can pause it.
let lenis: Lenis | null = null;
let count = 0;

export function registerLenis(instance: Lenis | null) {
  lenis = instance;
}

/**
 * Lock page scroll for a full-screen overlay (mobile menu, cart drawer,
 * lightbox). Reference-counted so overlapping overlays don't unlock each other.
 * Crucially it also STOPS Lenis: `body { overflow: hidden }` alone does nothing
 * against Lenis's rAF-driven virtual scroll, so without this the page scrolls
 * behind the overlay (reads as janky).
 */
export function lockScroll() {
  count += 1;
  if (count === 1) {
    document.body.style.overflow = 'hidden';
    lenis?.stop();
  }
}

export function unlockScroll() {
  count = Math.max(0, count - 1);
  if (count === 0) {
    document.body.style.overflow = '';
    lenis?.start();
  }
}

/**
 * Smooth-scroll to the very top (the home hero). Used by the header logo so that
 * clicking it while already on the home route glides back to the film rather than
 * doing nothing. Uses the live Lenis instance when present (matching the site's
 * inertia) and falls back to native smooth scroll.
 */
export function scrollToTop() {
  if (lenis) {
    lenis.start(); // in case an overlay left it stopped
    lenis.scrollTo(0, { duration: 1.1 });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
