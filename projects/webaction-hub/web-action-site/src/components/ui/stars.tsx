import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Site-wide starfield.
 *
 * This used to render ~2,650 stars as a single giant CSS `box-shadow` string on
 * 1px elements spanning ±2000px. That forces the browser to rasterize a huge
 * (~4000×4000px) paint area per layer *and* re-rasterize it as an infinite
 * animation drifts it — which made scrolling noticeably laggy on phones.
 *
 * Now each parallax layer is a <canvas> painted exactly once (cheap dots), and
 * the slow drift is a pure CSS `transform` animation. A transformed canvas is
 * cached as a single GPU texture, so the drift is compositor-only and scrolling
 * stays smooth even on low-powered mobile devices.
 */

const STRIP = 2000 // logical height of one seamless tile (matches the loop translate)

type LayerSpec = { densityPer1000: number; size: number; minA: number; maxA: number; durationS: number }

function paint(cv: HTMLCanvasElement | null, width: number, starColor: string, stars: number[][]) {
  if (!cv || width === 0) return
  cv.width = width
  cv.height = STRIP
  const ctx = cv.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, STRIP)
  ctx.fillStyle = starColor
  for (const [x, y, r, a] of stars) {
    ctx.globalAlpha = a
    ctx.beginPath()
    ctx.arc(x * width, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function StarCanvas({ width, spec, starColor }: { width: number; spec: LayerSpec; starColor: string }) {
  const aRef = React.useRef<HTMLCanvasElement>(null)
  const bRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    if (width === 0) return
    // generate the star set once, then paint the SAME data into both stacked
    // canvases so the upward drift loops with no seam or blank tile
    const count = Math.max(8, Math.round((spec.densityPer1000 * width) / 1000))
    const stars: number[][] = []
    for (let i = 0; i < count; i++) {
      stars.push([
        Math.random(), // x as a 0..1 fraction of width
        Math.random() * STRIP,
        spec.size * (0.6 + Math.random() * 0.7),
        spec.minA + Math.random() * (spec.maxA - spec.minA),
      ])
    }
    paint(aRef.current, width, starColor, stars)
    paint(bRef.current, width, starColor, stars)
  }, [width, spec, starColor])

  return (
    <div
      className="absolute left-0 top-0 w-full"
      style={{
        height: STRIP * 2,
        willChange: 'transform',
        animation: spec.durationS ? `wa-star-drift ${spec.durationS}s linear infinite` : undefined,
      }}
    >
      <canvas ref={aRef} className="absolute left-0 top-0 w-full" style={{ height: STRIP }} />
      <canvas ref={bRef} className="absolute left-0 w-full" style={{ top: STRIP, height: STRIP }} />
    </div>
  )
}

type StarsBackgroundProps = React.ComponentProps<'div'> & {
  speed?: number
  starColor?: string
}

export function StarsBackground({
  children,
  className,
  speed = 120,
  starColor = '#dfe8ff',
  ...props
}: StarsBackgroundProps) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(0)
  const [reduce, setReduce] = React.useState(false)

  React.useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const set = () => setWidth(el.clientWidth)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduce(mq.matches)
    const onMq = () => setReduce(mq.matches)
    mq.addEventListener?.('change', onMq)
    return () => {
      ro.disconnect()
      mq.removeEventListener?.('change', onMq)
    }
  }, [])

  const layers: LayerSpec[] = [
    { densityPer1000: 620, size: 0.8, minA: 0.35, maxA: 0.9, durationS: reduce ? 0 : speed },
    { densityPer1000: 240, size: 1.2, minA: 0.45, maxA: 1, durationS: reduce ? 0 : speed * 1.9 },
    { densityPer1000: 110, size: 1.8, minA: 0.55, maxA: 1, durationS: reduce ? 0 : speed * 3.2 },
  ]

  return (
    <div
      ref={hostRef}
      data-slot="stars-background"
      className={cn(
        'relative size-full overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)]',
        className,
      )}
      {...props}
    >
      <style>{`@keyframes wa-star-drift{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-${STRIP}px,0)}}`}</style>
      {width > 0 &&
        layers.map((spec, i) => (
          <StarCanvas key={i} width={width} spec={spec} starColor={starColor} />
        ))}
      {children}
    </div>
  )
}
