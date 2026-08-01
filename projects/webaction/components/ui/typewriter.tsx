'use client'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TypewriterProps {
  words: string[]
  className?: string
  typingSpeed?: number
  deletingSpeed?: number
  pauseMs?: number
}

export function Typewriter({
  words,
  className = '',
  typingSpeed = 80,
  deletingSpeed = 50,
  pauseMs = 2000,
}: TypewriterProps) {
  const [index, setIndex]       = useState(0)
  const [displayed, setDisplayd] = useState('')
  const [isDeleting, setDel]    = useState(false)

  useEffect(() => {
    const word = words[index]
    let timeout: ReturnType<typeof setTimeout>

    if (!isDeleting && displayed === word) {
      timeout = setTimeout(() => setDel(true), pauseMs)
    } else if (isDeleting && displayed === '') {
      setDel(false)
      setIndex((i) => (i + 1) % words.length)
    } else {
      timeout = setTimeout(() => {
        setDisplayd(
          isDeleting
            ? word.slice(0, displayed.length - 1)
            : word.slice(0, displayed.length + 1)
        )
      }, isDeleting ? deletingSpeed : typingSpeed)
    }

    return () => clearTimeout(timeout)
  }, [displayed, isDeleting, index, words, pauseMs, typingSpeed, deletingSpeed])

  return (
    <span className={cn('inline-flex items-center', className)}>
      <span>{displayed}</span>
      <span className="ml-0.5 inline-block w-0.5 h-[1em] bg-current animate-pulse" />
    </span>
  )
}
