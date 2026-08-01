import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/**
 * Cinematic reveal-on-scroll: fades and lifts into view.
 *
 * Note: this used to also animate `scale` and `filter: blur(...)`. Both force
 * the browser to repaint (blur especially so — it can't be composited on the
 * GPU the way opacity/transform can), which made the reveal feel laggy on
 * phones, most noticeably on the large phone-mockup image in the studio
 * section. Sticking to opacity + transform keeps the same "fades and drifts
 * up into place" feel while staying smooth on lower-powered devices.
 */
export function Reveal({
  children,
  delay = 0,
  y = 36,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-90px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: 'opacity, transform' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
