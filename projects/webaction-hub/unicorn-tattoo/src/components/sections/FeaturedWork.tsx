'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Reveal from '@/components/ui/Reveal';
import Media from '@/components/ui/Media';
import NeuroBackground from '@/components/ui/NeuroBackground';
import { FEATURED_WORK, type WorkItem } from '@/lib/content';

export default function FeaturedWork({ items = FEATURED_WORK }: { items?: WorkItem[] }) {
  const t = useTranslations('featured');
  const locale = useLocale();

  return (
    <section id="work" className="relative overflow-hidden py-16 sm:py-24">
      {/* Ambient teal NeuroNoise field behind the work. */}
      <NeuroBackground opacity={0.34} speed={0.35} scale={1.4} overlay="soft" />

      <div className="relative z-10 edge mx-auto max-w-edge">
      <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Reveal as="p" className="eyebrow mb-5 flex items-center gap-3">
            <span className="inline-block h-px w-10 bg-violet" />
            {t('kicker')}
          </Reveal>
          <Reveal as="h2" className="font-display text-[clamp(2rem,5vw,3.75rem)] leading-tight tracking-[-0.01em] text-bone">
            {t('heading')}
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <Link href="/portfolio" className="ink-link text-sm uppercase tracking-kicker text-bone-dim hover:text-bone">
            {t('cta')} →
          </Link>
        </Reveal>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {items.map((item, i) => (
          <Reveal
            key={item.id}
            delay={(i % 5) * 0.07}
            className={i === 0 ? 'relative col-span-2 sm:col-span-1' : 'relative'}
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <Media
                src={item.src}
                alt={locale === 'el' ? item.altEl : item.alt}
                position="50% 30%"
                sizes={
                  i === 0
                    ? '(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw'
                    : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw'
                }
                priority={i === 0}
              />
            </div>
          </Reveal>
        ))}
      </div>
      </div>
    </section>
  );
}
