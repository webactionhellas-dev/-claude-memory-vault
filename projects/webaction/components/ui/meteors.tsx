'use client'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export function Meteors({ number = 20, className }: { number?: number; className?: string }) {
  const [meteors, setMeteors] = useState<
    { id: number; top: string; left: string; dur: string; delay: string }[]
  >([])

  useEffect(() => {
    setMeteors(
      Array.from({ length: number }, (_, i) => ({
        id: i,
        top:   `${Math.random() * 100}%`,
        left:  `${Math.random() * 100}%`,
        dur:   `${(Math.random() * 6 + 4).toFixed(1)}s`,
        delay: `${(Math.random() * 4).toFixed(1)}s`,
      }))
    )
  }, [number])

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {meteors.map(m => (
        <span
          key={m.id}
          className="absolute h-px w-px rotate-[215deg] animate-meteor rounded-full bg-white"
          style={{ top: m.top, left: m.left, animationDuration: m.dur, animationDelay: m.delay }}
        >
          {/* Tail */}
          <span className="absolute top-1/2 -z-10 h-px w-[60px] -translate-y-1/2 bg-gradient-to-r from-white/80 via-white/30 to-transparent" />
        </span>
      ))}
    </div>
  )
}
