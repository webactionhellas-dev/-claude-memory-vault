'use client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export function Aurora({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 left-1/4 w-[700px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px]"
      />
      <motion.div
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.15, 0.35, 0.15], x: [0, -20, 0], y: [0, 30, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-10 right-1/4 w-[500px] h-[400px] rounded-full bg-cyan-500/15 blur-[100px]"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2], x: [0, 15, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-violet-600/15 blur-[100px]"
      />
    </div>
  )
}
