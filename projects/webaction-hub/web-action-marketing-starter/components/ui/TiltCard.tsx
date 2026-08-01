"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/lib/utils";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  max?: number; // max tilt in degrees
};

/**
 * 3D hover tilt with a soft glare that follows the cursor. Used for the
 * villa cards and experience tiles.
 */
export function TiltCard({ children, className, max = 8 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), {
    stiffness: 200,
    damping: 20,
  });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), {
    stiffness: 200,
    damping: 20,
  });

  const glareX = useTransform(px, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(py, [0, 1], ["0%", "100%"]);
  // Hoisted to the top level so the hook is never called conditionally.
  const glareBg = useTransform(
    [glareX, glareY],
    ([gx, gy]: string[]) =>
      `radial-gradient(320px circle at ${gx} ${gy}, rgba(36,120,181,0.14), transparent 60%)`,
  );

  function handleMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }

  function reset() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ rotateX: reduce ? 0 : rx, rotateY: reduce ? 0 : ry, transformPerspective: 1000 }}
      className={cn("group relative [transform-style:preserve-3d]", className)}
    >
      {children}
      {/* Cursor-tracking glare */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  );
}
