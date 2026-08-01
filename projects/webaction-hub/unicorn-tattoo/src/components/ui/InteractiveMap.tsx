'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LOCATIONS, type LocationId, type StudioLocation } from '@/lib/content';
import { cn } from '@/lib/utils';

/**
 * Keyless Google Maps embed of the studio's REAL business listing. The classic
 * `maps.google.com/...&output=embed` URL now 301s into a frame-blocked page
 * (blank iframe), so this uses the official `/maps/embed?pb=` endpoint. The
 * `!1s<ftid>!2s<listing name>` block ties the embed to the actual Google
 * Business place, so the map shows the shop's own marker + info card -
 * identical to what Google's share→embed generates for the listing.
 */
function embedSrc(l: StudioLocation, locale: string) {
  return (
    'https://www.google.com/maps/embed?pb=' +
    '!1m18!1m12!1m3!1d1570' +
    `!2d${l.geo.lng}!3d${l.geo.lat}` +
    '!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1' +
    `!3m3!1m2!1s${encodeURIComponent(l.place.ftid)}!2s${encodeURIComponent(l.place.name)}` +
    `!5e0!3m2!1s${locale}!2sgr!4v1700000000000`
  );
}

export default function InteractiveMap({
  className,
  locations = LOCATIONS
}: {
  className?: string;
  locations?: StudioLocation[];
}) {
  const t = useTranslations('locations');
  const tp = useTranslations('pages');
  const locale = useLocale();
  const [active, setActive] = useState<LocationId>(locations[0].id);
  const loc = locations.find((l) => l.id === active) ?? locations[0];
  const city = locale === 'el' ? loc.cityEl : loc.city;
  const street = locale === 'el' ? loc.streetEl : loc.street;
  const note = locale === 'el' ? loc.noteEl : loc.note;

  return (
    <div
      className={cn(
        'grid overflow-hidden rounded-2xl border border-white/8 bg-ink-800 lg:grid-cols-[0.9fr_1.1fr]',
        className
      )}
    >
      {/* Details + toggle */}
      <div className="order-2 flex flex-col p-7 sm:p-10 lg:order-1">
        <div role="tablist" aria-label={tp('chooseStudio')} className="flex gap-2">
          {locations.map((l) => {
            const selected = l.id === active;
            return (
              <button
                key={l.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(l.id)}
                className={cn(
                  'flex-1 inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-[11px] uppercase tracking-kicker transition-colors duration-300',
                  selected
                    ? 'border-violet bg-violet/15 text-bone'
                    : 'border-white/15 text-bone-dim hover:border-white/40 hover:text-bone'
                )}
              >
                {locale === 'el' ? l.cityEl : l.city}
              </button>
            );
          })}
        </div>

        <div key={active} className="mt-8 flex flex-1 animate-[fadein_0.45s_ease] flex-col">
          <h3 className="font-display text-4xl text-bone sm:text-5xl">{city}</h3>
          <p className="mt-3 text-base leading-relaxed text-bone-dim">
            {street}
            {note && (
              <>
                <br />
                <span className="text-bone-faint">{note}</span>
              </>
            )}
          </p>

          <dl className="mt-7 space-y-3 border-t border-white/5 pt-7 text-sm">
            <Row label={t('call')}>
              <a href={loc.phoneHref} className="ink-link text-bone hover:text-violet">
                {loc.phone}
              </a>
            </Row>
            <Row label={t('email')}>
              <a href={`mailto:${loc.email}`} className="ink-link break-all text-bone hover:text-violet">
                {loc.email}
              </a>
            </Row>
            <Row label={t('hoursLabel')}>
              <span className="text-bone-dim">{t('hours')}</span>
            </Row>
          </dl>

          <a
            href={loc.mapsUrl}
            className="mt-auto inline-flex w-fit items-center gap-2 self-start pt-8 text-[11px] uppercase tracking-kicker text-bone transition-colors hover:text-violet"
          >
            {tp('openMaps')} →
          </a>
        </div>
      </div>

      {/* One map box, both studios loaded once - switching studios crossfades
          live between them (no iframe remount, no reload, no scroll jank).
          NOTE: no CSS filter here - filtered iframes repaint on every scroll
          frame and glitch badly under smooth scrolling. */}
      <div className="relative order-1 min-h-[320px] bg-ink-700 lg:order-2 lg:min-h-[520px]">
        {locations.map((l) => {
          const cityName = locale === 'el' ? l.cityEl : l.city;
          const shown = l.id === active;
          return (
            <iframe
              key={l.id}
              title={`Map · ${cityName}`}
              src={embedSrc(l, locale)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className={cn(
                'absolute inset-0 h-full w-full border-0 transition-opacity duration-500',
                shown ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-[11px] uppercase tracking-kicker text-bone-faint">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}
