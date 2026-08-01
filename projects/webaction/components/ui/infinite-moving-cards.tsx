'use client'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface MovingCardsProps {
  items: { label: string; icon?: string }[]
  direction?: 'left' | 'right'
  speed?: 'slow' | 'normal' | 'fast'
  pauseOnHover?: boolean
  className?: string
}

export function InfiniteMovingCards({
  items,
  direction = 'left',
  speed = 'normal',
  pauseOnHover = true,
  className,
}: MovingCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef    = useRef<HTMLUListElement>(null)
  const [start, setStart] = useState(false)

  useEffect(() => {
    if (containerRef.current && scrollRef.current) {
      const el = scrollRef.current
      Array.from(el.children).forEach((child) => {
        el.appendChild(child.cloneNode(true))
      })
      containerRef.current.style.setProperty(
        '--animation-direction',
        direction === 'left' ? 'forwards' : 'reverse'
      )
      containerRef.current.style.setProperty(
        '--animation-duration',
        speed === 'fast' ? '20s' : speed === 'slow' ? '60s' : '35s'
      )
      setStart(true)
    }
  }, [direction, speed])

  return (
    <div
      ref={containerRef}
      className={cn(
        'scroller relative z-20 overflow-hidden',
        '[mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]',
        className
      )}
    >
      <ul
        ref={scrollRef}
        className={cn(
          'flex min-w-full shrink-0 gap-4 py-2 w-max flex-nowrap',
          start && 'animate-scroll',
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}
      >
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-white/10 bg-white/5
              text-neutral-300 text-sm font-medium whitespace-nowrap flex-shrink-0
              hover:border-indigo-500/40 hover:text-white transition-colors"
          >
            {item.icon && <span className="text-base">{item.icon}</span>}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
