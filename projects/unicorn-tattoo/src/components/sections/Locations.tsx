'use client';

import { useTranslations } from 'next-intl';
import Reveal from '@/components/ui/Reveal';
import InteractiveMap from '@/components/ui/InteractiveMap';
import type { StudioLocation } from '@/lib/content';

export default function Locations({ locations }: { locations?: StudioLocation[] }) {
  const t = useTranslations('locations');

  return (
    <section id="studios" className="edge mx-auto max-w-edge py-16 sm:py-24">
      <div className="mb-14">
        <Reveal as="p" className="eyebrow mb-5 flex items-center gap-3">
          <span className="inline-block h-px w-10 bg-violet" />
          {t('kicker')}
        </Reveal>
        <Reveal as="h2" className="font-display text-[clamp(2rem,5vw,3.75rem)] uppercase leading-tight tracking-[-0.01em] text-bone">
          {t('heading')}
        </Reveal>
      </div>

      <Reveal>
        <InteractiveMap locations={locations} />
      </Reveal>
    </section>
  );
}
