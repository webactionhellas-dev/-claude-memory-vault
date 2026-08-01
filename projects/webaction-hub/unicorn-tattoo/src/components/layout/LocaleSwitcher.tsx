'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export default function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className={cn('flex items-center gap-1 text-[11px] uppercase tracking-kicker', className)}
      role="group"
      aria-label="Language"
    >
      {routing.locales.map((loc, i) => (
        <span key={loc} className="flex items-center">
          {i > 0 && <span className="mx-1 text-bone-faint">/</span>}
          <button
            type="button"
            onClick={() => router.replace(pathname, { locale: loc })}
            aria-current={loc === locale ? 'true' : undefined}
            className={cn(
              'transition-colors duration-300',
              loc === locale ? 'text-bone' : 'text-bone-faint hover:text-violet'
            )}
          >
            {loc}
          </button>
        </span>
      ))}
    </div>
  );
}
