// House motion primitives (GSAP + Lenis). See the design-standards skill's
// motion.md for the full recipe set across all three tiers (2D, WebGL heroes,
// full experiential) and the NAMI technique catalog. Prefer these over Framer
// for load-critical animation. All honor prefers-reduced-motion and are robust
// in this machine's headless preview.
export { SmoothScroll } from "./SmoothScroll";
export { Reveal } from "./Reveal";
export { SplitReveal } from "./SplitReveal";
export { MagneticButton } from "./MagneticButton";
export { HorizontalScroll } from "./HorizontalScroll"; // pinned sideways scroll (+ optional snap)
export { Marquee } from "./Marquee"; // scroll-velocity kinetic marquee
export { Pin } from "./Pin"; // pin a section for chaptered storytelling
export { CustomCursor } from "./CustomCursor"; // lagging quickTo cursor, grows on [data-cursor]
