import { cn } from '@/lib/utils'

// served from /public (?v bumps the cache when the artwork changes)
const logoUrl = '/logo.webp?v=9'
const ALT = 'Web Action, Web & App Development'

/**
 * The official Web Action logo (your exact artwork, black background knocked
 * out to transparency so it sits on any dark surface).
 */

/** Full stacked logo — for the hero. */
export function LogoLockup({
  className,
  markClass,
}: {
  className?: string
  markClass?: string
}) {
  return (
    <div className={cn('flex justify-center', className)}>
      <img
        src={logoUrl}
        alt={ALT}
        width={1103}
        height={524}
        decoding="async"
        className={cn('h-28 w-auto sm:h-36 lg:h-40', markClass)}
        draggable={false}
      />
    </div>
  )
}

/** Navbar lockup. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt={ALT}
      width={1103}
      height={524}
      decoding="async"
      className={cn('h-9 w-auto sm:h-10', className)}
      draggable={false}
    />
  )
}

/** Footer / generic logo. */
export function Mark({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt={ALT}
      width={1103}
      height={524}
      decoding="async"
      className={cn('h-12 w-auto', className)}
      draggable={false}
    />
  )
}
