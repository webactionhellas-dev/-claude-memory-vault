import { motion, type Variants } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { LogoLockup } from '@/components/brand/Logo'
import { useI18n } from '@/i18n/LanguageProvider'

type Point = {
  x: number
  y: number
}

interface WaveConfig {
  offset: number
  amplitude: number
  frequency: number
  color: string
  opacity: number
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, staggerChildren: 0.12 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export function GlowyWavesHero() {
  const { c } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mouseRef = useRef<Point>({ x: 0, y: 0 })
  const targetMouseRef = useRef<Point>({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    let animationId: number
    let time = 0

    const computeThemeColors = () => {
      const rootStyles = getComputedStyle(document.documentElement)

      const resolveColor = (variables: string[], alpha = 1) => {
        const tempEl = document.createElement('div')
        tempEl.style.position = 'absolute'
        tempEl.style.visibility = 'hidden'
        tempEl.style.width = '1px'
        tempEl.style.height = '1px'
        document.body.appendChild(tempEl)

        let color = `rgba(255, 255, 255, ${alpha})`

        for (const variable of variables) {
          const value = rootStyles.getPropertyValue(variable).trim()
          if (value) {
            tempEl.style.backgroundColor = `hsl(var(${variable}))`
            const computedColor = getComputedStyle(tempEl).backgroundColor

            if (computedColor && computedColor !== 'rgba(0, 0, 0, 0)') {
              if (alpha < 1) {
                const rgbMatch = computedColor.match(
                  /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/
                )
                if (rgbMatch) {
                  color = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`
                } else {
                  color = computedColor
                }
              } else {
                color = computedColor
              }
              break
            }
          }
        }

        document.body.removeChild(tempEl)
        return color
      }

      return {
        backgroundTop: resolveColor(['--background'], 1),
        backgroundBottom: resolveColor(['--muted', '--background'], 0.95),
        wavePalette: [
          {
            offset: 0,
            amplitude: 70,
            frequency: 0.003,
            color: resolveColor(['--primary'], 0.85),
            opacity: 0.5,
          },
          {
            offset: Math.PI / 2,
            amplitude: 90,
            frequency: 0.0026,
            color: resolveColor(['--accent', '--primary'], 0.7),
            opacity: 0.4,
          },
          {
            offset: Math.PI,
            amplitude: 60,
            frequency: 0.0034,
            color: resolveColor(['--foreground'], 0.5),
            opacity: 0.28,
          },
          {
            offset: Math.PI * 1.5,
            amplitude: 80,
            frequency: 0.0022,
            color: resolveColor(['--primary'], 0.35),
            opacity: 0.25,
          },
          {
            offset: Math.PI * 2,
            amplitude: 55,
            frequency: 0.004,
            color: resolveColor(['--foreground'], 0.3),
            opacity: 0.2,
          },
        ] satisfies WaveConfig[],
      }
    }

    let themeColors = computeThemeColors()

    const handleThemeMutation = () => {
      themeColors = computeThemeColors()
    }

    const observer = new MutationObserver(handleThemeMutation)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    const mouseInfluence = prefersReducedMotion ? 10 : 70
    const influenceRadius = prefersReducedMotion ? 160 : 320
    const smoothing = prefersReducedMotion ? 0.04 : 0.1

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const recenterMouse = () => {
      const centerPoint = { x: canvas.width / 2, y: canvas.height / 2 }
      mouseRef.current = centerPoint
      targetMouseRef.current = centerPoint
    }

    const handleResize = () => {
      resizeCanvas()
      recenterMouse()
    }

    const handleMouseMove = (event: MouseEvent) => {
      targetMouseRef.current = { x: event.clientX, y: event.clientY }
    }

    const handleMouseLeave = () => {
      recenterMouse()
    }

    resizeCanvas()
    recenterMouse()

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    const drawWave = (wave: WaveConfig) => {
      ctx.save()
      ctx.beginPath()

      for (let x = 0; x <= canvas.width; x += 4) {
        const dx = x - mouseRef.current.x
        const dy = canvas.height / 2 - mouseRef.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const influence = Math.max(0, 1 - distance / influenceRadius)
        const mouseEffect =
          influence *
          mouseInfluence *
          Math.sin(time * 0.001 + x * 0.01 + wave.offset)

        const y =
          canvas.height / 2 +
          Math.sin(x * wave.frequency + time * 0.002 + wave.offset) *
            wave.amplitude +
          Math.sin(x * wave.frequency * 0.4 + time * 0.003) *
            (wave.amplitude * 0.45) +
          mouseEffect

        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.lineWidth = 2.5
      ctx.strokeStyle = wave.color
      ctx.globalAlpha = wave.opacity
      ctx.shadowBlur = 35
      ctx.shadowColor = wave.color
      ctx.stroke()

      ctx.restore()
    }

    const animate = () => {
      time += 1

      mouseRef.current.x +=
        (targetMouseRef.current.x - mouseRef.current.x) * smoothing
      mouseRef.current.y +=
        (targetMouseRef.current.y - mouseRef.current.y) * smoothing

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, themeColors.backgroundTop)
      gradient.addColorStop(1, themeColors.backgroundBottom)

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      themeColors.wavePalette.forEach(drawWave)

      animationId = window.requestAnimationFrame(animate)
    }

    animationId = window.requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationId)
      observer.disconnect()
    }
  }, [])

  return (
    <section
      className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden bg-background"
      role="region"
      aria-label="Web Action hero"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />

      {/* vignette so content stays legible over the waves */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 35%, transparent 28%, hsl(225 30% 5% / 0.6) 76%, hsl(225 32% 3% / 0.92) 100%)',
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-24 text-center md:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex w-full flex-col items-center"
        >
          <motion.div variants={itemVariants}>
            <LogoLockup className="mb-9" markClass="drop-shadow-[0_14px_44px_rgba(51,102,255,0.45)]" />
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-[0.7rem] font-medium uppercase tracking-[0.3em] text-foreground/85 backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {c.hero.badge}
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mb-7 font-display text-[2.7rem] font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-[4.6rem]"
          >
            {c.hero.titleA}{' '}
            <span className="blue-grad">{c.hero.titleHighlight}</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto mb-10 max-w-2xl text-base font-light leading-relaxed text-foreground/65 sm:text-lg md:text-xl"
          >
            {c.hero.subtitle}
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4"
          >
            <Button
              asChild
              size="lg"
              variant="primary"
              className="group w-full gap-2 rounded-full px-8 text-sm uppercase tracking-[0.18em] sm:w-auto"
            >
              <a href="#contact">
                {c.hero.ctaPrimary}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full rounded-full bg-background/30 px-8 text-sm uppercase tracking-[0.18em] backdrop-blur sm:w-auto"
            >
              <a href="#services">{c.hero.ctaSecondary}</a>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 text-[0.6rem] uppercase tracking-[0.4em] text-foreground/40">
        <span className="animate-glow">{c.hero.scroll}</span>
      </div>
    </section>
  )
}
