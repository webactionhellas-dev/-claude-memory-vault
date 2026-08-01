import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import Reveal from '@/components/ui/Reveal';
import { SPECIALTIES } from '@/lib/content';

/**
 * "What we do" - each row opens that style's own gallery page
 * (/portfolio/[style]); piercing goes to its dedicated page.
 */
export default async function Specialties() {
  const t = await getTranslations('specialties');

  return (
    <section id="specialties" className="relative border-y border-white/5 bg-ink-900">
      <div className="edge mx-auto max-w-edge py-16 sm:py-24">
        <div className="mb-12 flex items-end justify-between">
          <Reveal as="p" className="eyebrow flex items-center gap-3">
            <span className="inline-block h-px w-10 bg-violet" />
            {t('kicker')}
          </Reveal>
          <Reveal as="h2" className="font-display text-2xl text-bone-dim sm:text-3xl">
            {t('heading')}
          </Reveal>
        </div>

        <ul>
          {SPECIALTIES.map((id, i) => (
            <Reveal as="li" key={id} delay={i * 0.05}>
              <Link
                href={id === 'piercing' ? '/piercing' : `/portfolio/${id}`}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-5 border-t border-white/5 py-7 transition-colors duration-500 last:border-b hover:bg-white/[0.02] sm:gap-8 sm:py-8"
              >
                <span className="font-sans text-xs tabular-nums text-bone-faint">0{i + 1}</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-8">
                  <span className="min-w-0 font-display text-[clamp(1.6rem,4vw,3rem)] uppercase leading-none text-bone transition-colors duration-500 group-hover:text-violet sm:min-w-[8.5rem]">
                    {t(`${id}Title`)}
                  </span>
                  <span className="max-w-md text-sm leading-relaxed text-bone-dim">
                    {t(`${id}Desc`)}
                  </span>
                </div>
                <span className="text-bone-faint transition-all duration-500 group-hover:translate-x-1 group-hover:text-violet">
                  →
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
