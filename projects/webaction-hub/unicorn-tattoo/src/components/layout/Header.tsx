'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { SITE } from '@/lib/content';
import LocaleSwitcher from './LocaleSwitcher';
import Wordmark from '@/components/ui/Wordmark';
import { lockScroll, unlockScroll, scrollToTop } from '@/lib/scroll-lock';
import { cn } from '@/lib/utils';

const NAV_LEFT = [
  { key: 'portfolio', href: '/portfolio' },
  { key: 'artists', href: '/artists' },
  { key: 'piercing', href: '/piercing' }
] as const;

const NAV_RIGHT = [
  { key: 'about', href: '/about' },
  { key: 'studios', href: '/studios' }
] as const;

const ALL_NAV = [...NAV_LEFT, ...NAV_RIGHT];

function NavLink({
  href,
  label,
  active
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'ink-link text-[11px] uppercase tracking-kicker transition-colors duration-300',
        active ? 'text-bone' : 'text-bone-dim hover:text-bone'
      )}
    >
      {label}
    </Link>
  );
}

export default function Header({
  social = SITE.social
}: {
  social?: { instagram: string; instagramHandle: string; facebook: string };
}) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  // Logo always returns to the home hero. On a subpage the Link navigates to '/'
  // (which lands at the top); when already on home a same-route Link is a no-op,
  // so glide back to the film ourselves instead of doing nothing.
  const onLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    if (pathname === '/') {
      e.preventDefault();
      scrollToTop();
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    return () => unlockScroll();
  }, [open]);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-colors duration-500 ease-ink',
          scrolled || open
            ? 'border-b border-white/5 bg-ink/80 backdrop-blur-xl'
            : 'bg-gradient-to-b from-ink/60 to-transparent'
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="edge mx-auto flex h-[78px] max-w-edge items-center gap-4 sm:h-[92px]">
          {/* Left - hamburger (mobile) + first half of nav (desktop) */}
          <div className="flex flex-1 items-center gap-7">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="relative z-10 flex h-11 w-11 flex-col items-center justify-center gap-[5px] lg:hidden"
            >
              <span
                className={cn(
                  'h-px w-6 bg-bone transition-all duration-300',
                  open && 'translate-y-[3px] rotate-45'
                )}
              />
              <span
                className={cn(
                  'h-px w-6 bg-bone transition-all duration-300',
                  open && '-translate-y-[3px] -rotate-45'
                )}
              />
            </button>

            <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
              {NAV_LEFT.map((item) => (
                <NavLink key={item.key} href={item.href} label={t(item.key)} active={isActive(item.href)} />
              ))}
            </nav>
          </div>

          {/* Center - logo. On the home hero the big centered wordmark is
              already on screen, so the header copy stays hidden until scroll. */}
          <Link
            href="/"
            onClick={onLogoClick}
            aria-label="Unicorn Tattoo - home"
            className={cn(
              'shrink-0 transition-opacity duration-500',
              pathname === '/' && !scrolled && !open
                ? 'pointer-events-none opacity-0'
                : 'opacity-100 hover:opacity-80'
            )}
          >
            <Wordmark className="h-10 sm:h-12" priority />
          </Link>

          {/* Right - second half of nav + language + book */}
          <div className="flex flex-1 items-center justify-end gap-7">
            <nav className="hidden items-center gap-7 lg:flex" aria-label="Secondary">
              {NAV_RIGHT.map((item) => (
                <NavLink key={item.key} href={item.href} label={t(item.key)} active={isActive(item.href)} />
              ))}
            </nav>
            <span className="hidden h-4 w-px bg-white/15 lg:block" />
            <LocaleSwitcher className="hidden sm:flex" />
            <Link
              href="/studios"
              className="hidden shrink-0 whitespace-nowrap rounded-full border border-violet/40 px-5 py-2.5 text-[11px] uppercase tracking-kicker text-bone transition-colors duration-500 ease-ink hover:border-violet hover:bg-violet hover:text-ink xl:inline-block"
            >
              {t('book')}
            </Link>
          </div>
        </div>
      </header>

      {/* Full-screen menu - sibling of the blurred header so position:fixed is not
          trapped by the header's backdrop-filter ancestor. */}
      <MobileMenu open={open} onClose={() => setOpen(false)} social={social} />
    </>
  );
}

function MobileMenu({
  open,
  onClose,
  social
}: {
  open: boolean;
  onClose: () => void;
  social: { instagram: string; instagramHandle: string };
}) {
  const t = useTranslations('nav');

  return (
    <div
      className={cn(
        'fixed inset-0 z-40 flex flex-col bg-ink-900 transition-[opacity,visibility] duration-500 ease-ink lg:hidden',
        open ? 'visible opacity-100' : 'invisible opacity-0'
      )}
      style={{ paddingTop: 'calc(78px + env(safe-area-inset-top))' }}
      aria-hidden={!open}
    >
      <nav className="edge flex flex-1 flex-col justify-center gap-1" aria-label="Mobile">
        {[...ALL_NAV, { key: 'book', href: '/studios' } as const].map((item, i) => (
          <Link
            key={item.key}
            href={item.href}
            onClick={onClose}
            className="font-display text-[clamp(1.9rem,10vw,3.25rem)] uppercase leading-[1.0] break-words text-bone transition-colors duration-300 hover:text-violet"
            style={{
              transitionDelay: open ? `${120 + i * 55}ms` : '0ms',
              transform: open ? 'translateY(0)' : 'translateY(12px)',
              opacity: open ? 1 : 0,
              transitionProperty: 'transform, opacity, color'
            }}
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>
      <div className="edge flex items-center justify-between py-8">
        <LocaleSwitcher />
        <a href={social.instagram} className="text-[12px] uppercase tracking-kicker text-bone-dim hover:text-violet">
          {social.instagramHandle}
        </a>
      </div>
    </div>
  );
}
