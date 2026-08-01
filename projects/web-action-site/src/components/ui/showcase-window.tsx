import { cn } from '@/lib/utils'

/**
 * Windowed showcase (adapted from the Next.js "hero-section-note" pattern to
 * Vite/React): a browser-framed window with a live code panel on the left and
 * a render of the Web Action hero on the right — design + code, side by side.
 */

type ColorKey = 'kw' | 'str' | 'tag' | 'attr' | 'fn' | 'num' | 'com' | 'pl' | 'pun'

const COLOR: Record<ColorKey, string> = {
  kw: 'text-[#569CD6]',
  str: 'text-[#CE9178]',
  tag: 'text-[#4EC9B0]',
  attr: 'text-[#9CDCFE]',
  fn: 'text-[#DCDCAA]',
  num: 'text-[#B5CEA8]',
  com: 'text-[#6A9955]',
  pl: 'text-[#D4D4D4]',
  pun: 'text-[#7d8590]',
}

type Tok = [string, ColorKey]

const CODE: Tok[][] = [
  [['import ', 'kw'], ['{ motion } ', 'pl'], ['from ', 'kw'], ['"framer-motion"', 'str']],
  [],
  [['export function ', 'kw'], ['Hero', 'fn'], ['() {', 'pun']],
  [['  return (', 'kw']],
  [['    <', 'pun'], ['section', 'tag'], [' className=', 'attr'], ['"relative h-screen"', 'str'], ['>', 'pun']],
  [['      <', 'pun'], ['Starfield', 'tag'], [' density=', 'attr'], ['{', 'pun'], ['900', 'num'], ['}', 'pun'], [' />', 'pun']],
  [['      <', 'pun'], ['Planet', 'tag'], [' src=', 'attr'], ['"/earth.png?v=2"', 'str'], [' />', 'pun']],
  [['      <', 'pun'], ['motion.img', 'tag'], [' src=', 'attr'], ['"/logo.png"', 'str']],
  [['        animate=', 'attr'], ['{{ ', 'pun'], ['opacity: ', 'pl'], ['1', 'num'], [', y: ', 'pl'], ['0', 'num'], [' }}', 'pun'], [' />', 'pun']],
  [['      ', 'pl'], ['{/* design · code · action */}', 'com']],
  [['    </', 'pun'], ['section', 'tag'], ['>', 'pun']],
  [['  )', 'pun']],
  [['}', 'pun']],
]

export function ShowcaseWindow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl p-[1px]',
        'bg-gradient-to-br from-primary/40 via-white/10 to-primary/20',
        className,
      )}
    >
      {/* glow */}
      <div className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(50%_50%_at_50%_0%,rgba(51,102,255,0.25),transparent)]" />

      <div className="overflow-hidden rounded-[calc(1.5rem-1px)] bg-[#0b0e16] shadow-2xl shadow-black/50">
        {/* browser top bar */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-[#0d1018] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto flex items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-[0.7rem] text-foreground/55">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            webaction.gr
          </div>
          <div className="hidden w-12 sm:block" />
        </div>

        {/* split: code + live preview */}
        <div className="grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)]">
          {/* code panel */}
          <div className="hidden overflow-hidden border-r border-white/10 bg-[#0b0e16] p-4 font-mono text-[0.72rem] leading-[1.55] lg:block">
            <div className="mb-3 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-foreground/35">
              <span className="rounded bg-white/5 px-2 py-0.5 text-foreground/55">Hero.tsx</span>
            </div>
            {CODE.map((line, i) => (
              <div key={i} className="flex">
                <span className="mr-4 w-5 shrink-0 select-none text-right text-[#3a4254]">{i + 1}</span>
                <code className="whitespace-pre">
                  {line.length === 0 ? ' ' : line.map((tok, j) => (
                    <span key={j} className={COLOR[tok[1]]}>{tok[0]}</span>
                  ))}
                </code>
              </div>
            ))}
          </div>

          {/* live hero render */}
          <div className="relative aspect-[16/11] overflow-hidden bg-black lg:aspect-auto">
            {/* bottom blue glow */}
            <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_115%,rgba(51,102,255,0.35),transparent_60%)]" />
            {/* static star sprinkle */}
            <div
              className="absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  'radial-gradient(1.4px 1.4px at 12% 22%, #fff, transparent), radial-gradient(1.2px 1.2px at 32% 48%, #cdd9ff, transparent), radial-gradient(1.6px 1.6px at 58% 18%, #fff, transparent), radial-gradient(1.2px 1.2px at 74% 40%, #fff, transparent), radial-gradient(1.3px 1.3px at 86% 26%, #cdd9ff, transparent), radial-gradient(1.1px 1.1px at 22% 64%, #fff, transparent), radial-gradient(1.4px 1.4px at 46% 72%, #fff, transparent), radial-gradient(1.2px 1.2px at 67% 60%, #cdd9ff, transparent)',
              }}
            />
            {/* planet */}
            <img
              src="/earth.png?v=4"
              alt=""
              aria-hidden
              className="pointer-events-none absolute -bottom-[10%] left-1/2 w-[150%] max-w-none -translate-x-1/2 select-none opacity-95"
            />
            {/* logo + tagline */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <img src="/logo.png" alt="Web Action" className="w-[62%] max-w-[300px] drop-shadow-[0_8px_30px_rgba(51,102,255,0.5)]" />
              <div className="mt-3 text-[0.55rem] font-semibold uppercase tracking-[0.3em] text-foreground/70 sm:text-[0.65rem]">
                Design · Code · Action
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
