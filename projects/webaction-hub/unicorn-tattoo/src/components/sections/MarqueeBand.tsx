'use client';

import { useTranslations } from 'next-intl';
import Marquee from '@/components/ui/Marquee';

export default function MarqueeBand() {
  const t = useTranslations('specialties');
  const items = [
    t('realisticTitle'),
    t('graphicTitle'),
    t('geometricTitle'),
    t('letteringTitle'),
    t('piercingTitle'),
    'Est. 2001'
  ];

  return (
    <section className="border-y border-white/5 bg-ink-900 py-7 sm:py-9" aria-hidden="true">
      <Marquee items={items} />
    </section>
  );
}
