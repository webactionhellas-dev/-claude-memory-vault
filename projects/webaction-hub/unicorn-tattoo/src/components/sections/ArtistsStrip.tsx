'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Reveal from '@/components/ui/Reveal';
import Media from '@/components/ui/Media';
import NeuroBackground from '@/components/ui/NeuroBackground';
import { ARTISTS, type Artist } from '@/lib/content';

export default function ArtistsStrip({ artists = ARTISTS }: { artists?: Artist[] }) {
  const t = useTranslations('artists');

  return (
    <section id="artists" className="relative overflow-hidden py-16 sm:py-24">
      {/* Ambient teal NeuroNoise field behind the crew. */}
      <NeuroBackground opacity={0.4} speed={0.35} scale={1.4} overlay="soft" />

      <div className="relative z-10 edge mx-auto mb-14 flex max-w-edge flex-wrap items-end justify-between gap-6">
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
          <Link href="/artists" className="ink-link text-sm uppercase tracking-kicker text-bone-dim hover:text-bone">
            {t('cta')} →
          </Link>
        </Reveal>
      </div>

      <div className="relative z-10 edge mx-auto grid max-w-edge grid-cols-2 gap-4 lg:grid-cols-4">
        {artists.map((artist, i) => (
          <Reveal
            key={artist.slug}
            delay={i * 0.08}
            className="group relative"
          >
            {/* Soft teal backlight behind the portrait (home page only) - a
                subtle electric glow that lifts on hover. Sits behind the Link. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-4 opacity-40 blur-2xl transition-opacity duration-700 ease-ink group-hover:opacity-90"
              style={{
                background:
                  'radial-gradient(58% 58% at 50% 46%, rgba(70,183,206,0.34), transparent 70%)'
              }}
            />
            <Link href={`/artists/${artist.slug}`} className="relative block">
              <div className="relative aspect-[7/10] overflow-hidden">
                <Media
                  src={artist.portrait}
                  alt={artist.name}
                  position="50% 30%"
                  sizes="(max-width: 640px) 78vw, (max-width: 1024px) 44vw, 24vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 translate-y-2 p-5 opacity-0 transition-all duration-500 ease-ink group-hover:translate-y-0 group-hover:opacity-100">
                  <span className="rounded-full bg-ink/70 px-3 py-1.5 text-[11px] uppercase tracking-kicker text-violet backdrop-blur-sm">
                    {t('bookWith')} {artist.name} →
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-1.5">
                <h3 className="font-display text-2xl leading-none text-bone">{artist.name}</h3>
                <span className="text-[11px] uppercase tracking-kicker text-bone-faint">
                  {artist.styles.join(' · ')}
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
