'use client';

import { type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Variant = 'solid' | 'outline' | 'ghost';

interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  /** kept for API compatibility; the magnetic cursor effect was removed */
  strength?: number;
  /** opt-in hover sheen sweep (used on the hero) */
  fx?: boolean;
  ariaLabel?: string;
}

const base =
  'group relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[12px] font-medium uppercase tracking-kicker transition-colors duration-500 ease-ink';

const variants: Record<Variant, string> = {
  solid: 'bg-violet text-ink hover:bg-magenta hover:text-ink',
  outline: 'border border-bone/30 text-bone hover:border-violet hover:text-violet',
  ghost: 'text-bone hover:text-violet'
};

export default function MagneticButton({
  children,
  href,
  onClick,
  variant = 'solid',
  className,
  fx,
  ariaLabel
}: ButtonProps) {
  const shared = {
    className: cn(base, variants[variant], fx && 'overflow-hidden btn-fx', className),
    'aria-label': ariaLabel
  };

  if (href) {
    const isExternal =
      href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:');
    if (isExternal) {
      return (
        <a href={href} {...shared}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} {...shared}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} {...shared}>
      {children}
    </button>
  );
}
