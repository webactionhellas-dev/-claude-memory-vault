"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

const word: Variants = {
  hidden: { y: "115%" },
  show: { y: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * Word-by-word masked reveal — each word rises out of a clipped line.
 * Ideal for cinematic display headings. Pass plain text.
 */
export function RevealText({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <span className={className}>{text}</span>;

  return (
    <motion.span
      className={cn("inline", className)}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delayChildren: delay }}
    >
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom leading-[1.05]">
          <motion.span variants={word} className="inline-block">
            {w}
            {i < text.split(" ").length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
