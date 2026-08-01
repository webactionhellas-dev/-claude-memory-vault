import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedGradientBackgroundProps {
  className?: string
  children?: React.ReactNode
  intensity?: 'subtle' | 'medium' | 'strong'
}

interface Beam {
  x: number
  y: number
  width: number
  length: number
  angle: number
  speed: number
  opacity: number
  hue: number
  pulse: number
  pulseSpeed: number
}

// brand-blue hue range (~#3366FF) instead of the original cyan→violet
function createBeam(width: number, height: number): Beam {
  const angle = -35 + Math.random() * 10
  return {
    x: Math.random() * width * 1.5 - width * 0.25,
    y: Math.random() * height * 1.5 - height * 0.25,
    width: 30 + Math.random() * 60,
    length: height * 2.5,
    angle,
    speed: 0.6 + Math.random() * 1.2,
    opacity: 0.12 + Math.random() * 0.16,
    hue: 212 + Math.random() * 40,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.03,
  }
}

export function BeamsBackground({
  className,
  intensity = 'strong',
  children,
}: AnimatedGradientBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const beamsRef = useRef<Beam[]>([])
  const animationFrameRef = useRef<number>(0)
  const sizeRef = useRef({ w: 0, h: 0 })
  const MINIMUM_BEAMS = 20

  const opacityMap = { subtle: 0.7, medium: 0.85, strong: 1 }

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = container.clientWidth
      const h = container.clientHeight
      sizeRef.current = { w, h }
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const totalBeams = MINIMUM_BEAMS * 1.5
      beamsRef.current = Array.from({ length: totalBeams }, () => createBeam(w, h))
    }

    updateCanvasSize()
    const ro = new ResizeObserver(updateCanvasSize)
    ro.observe(container)

    function resetBeam(beam: Beam, index: number, totalBeams: number) {
      const { w, h } = sizeRef.current
      const column = index % 3
      const spacing = w / 3
      beam.y = h + 100
      beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5
      beam.width = 100 + Math.random() * 100
      beam.speed = 0.5 + Math.random() * 0.4
      beam.hue = 212 + (index * 40) / totalBeams
      beam.opacity = 0.2 + Math.random() * 0.1
      return beam
    }

    function drawBeam(c: CanvasRenderingContext2D, beam: Beam) {
      c.save()
      c.translate(beam.x, beam.y)
      c.rotate((beam.angle * Math.PI) / 180)
      const pulsingOpacity =
        beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * opacityMap[intensity]
      const gradient = c.createLinearGradient(0, 0, 0, beam.length)
      gradient.addColorStop(0, `hsla(${beam.hue}, 85%, 65%, 0)`)
      gradient.addColorStop(0.1, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.5})`)
      gradient.addColorStop(0.4, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity})`)
      gradient.addColorStop(0.6, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity})`)
      gradient.addColorStop(0.9, `hsla(${beam.hue}, 85%, 65%, ${pulsingOpacity * 0.5})`)
      gradient.addColorStop(1, `hsla(${beam.hue}, 85%, 65%, 0)`)
      c.fillStyle = gradient
      c.fillRect(-beam.width / 2, 0, beam.width, beam.length)
      c.restore()
    }

    function animate() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.filter = 'blur(35px)'
      const totalBeams = beamsRef.current.length
      beamsRef.current.forEach((beam, index) => {
        beam.y -= beam.speed
        beam.pulse += beam.pulseSpeed
        if (beam.y + beam.length < -100) resetBeam(beam, index, totalBeams)
        drawBeam(ctx, beam)
      })
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      ro.disconnect()
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [intensity])

  return (
    <div ref={containerRef} className={cn('relative w-full overflow-hidden bg-black', className)}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
        style={{ filter: 'blur(15px)' }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-black/5"
        animate={{ opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 10, ease: 'easeInOut', repeat: Infinity }}
        style={{ backdropFilter: 'blur(50px)' }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
