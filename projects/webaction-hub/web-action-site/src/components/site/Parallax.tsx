import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useSpring, useTransform, useReducedMotion } from 'framer-motion'

/**
 * Depth parallax: gently translates its children as the element travels
 * through the viewport, giving sections a layered, "alive" feel on scroll.
 * Respects prefers-reduced-motion.
 */
export function Parallax({
  children,
  distance = 40,
  className,
}: {
  children: ReactNode
  /** total vertical travel in px across the full scroll pass */
  distance?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const raw = useTransform(scrollYProgress, [0, 1], [distance, -distance])
  const y = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 })

  return (
    <motion.div ref={ref} style={{ y: reduce ? 0 : y }} className={className}>
      {children}
    </motion.div>
  )
}
