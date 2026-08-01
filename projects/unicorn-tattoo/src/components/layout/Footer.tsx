'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LOCATIONS, SITE, type StudioLocation } from '@/lib/content';
import Wordmark from '@/components/ui/Wordmark';

const NAV = ['portfolio', 'artists', 'piercing', 'about', 'studios'] as const;
const ROUTES: Record<string, string> = {
  portfolio: '/portfolio',
  artists: '/artists',
  piercing: '/piercing',
  about: '/about',
  studios: '/studios'
};

export default function Footer({
  locations = LOCATIONS,
  social = SITE.social,
  background = '/images/bg/footer-bg.jpg'
}: {
  locations?: StudioLocation[];
  social?: { instagram: string; facebook: string };
  background?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-ink-900">
      {/* Flash-art backdrop - fills the whole footer, behind the columns */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src={background}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-80 brightness-110 grayscale"
        />
        {/* Just enough grading to keep the columns readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/80 via-ink-900/20 to-ink-900/80" />
      </div>
      <div className="edge relative mx-auto max-w-edge py-16 sm:py-20">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-12">
          <div className="col-span-2 md:col-span-5">
            <Wordmark className="h-16" />
            <p className="mt-5 max-w-xs font-display text-xl leading-snug text-bone-dim">
              {t('footer.tagline')}
            </p>
          </div>

          <nav className="md:col-span-3" aria-label="Footer">
            <p className="eyebrow mb-5">{t('footer.navLabel')}</p>
            <ul className="space-y-3">
              {NAV.map((key) => (
                <li key={key}>
                  <Link href={ROUTES[key]} className="ink-link text-sm text-bone-dim hover:text-bone">
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-4">
            <p className="eyebrow mb-5">{t('footer.visitLabel')}</p>
            <ul className="space-y-5">
              {locations.map((loc) => (
                <li key={loc.id} className="text-sm leading-relaxed text-bone-dim">
                  <span className="text-bone">{locale === 'el' ? loc.cityEl : loc.city}</span>
                  <br />
                  {locale === 'el' ? loc.streetEl : loc.street}, {loc.postalCode}
                  <br />
                  <a href={loc.phoneHref} className="hover:text-violet">
                    {loc.phone}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/5 pt-8 text-[11px] uppercase tracking-kicker text-bone-faint sm:flex-row sm:items-center">
          <p>
            © {year} {SITE.name}. {t('footer.rights')}
          </p>
          <div className="flex items-center gap-5">
            <a href={social.instagram} className="hover:text-violet">
              Instagram
            </a>
            <a href={social.facebook} className="hover:text-violet">
              Facebook
            </a>
            <span className="text-bone-faint/60">{t('footer.madeIn')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
