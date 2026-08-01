'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Reveal from '@/components/ui/Reveal';
import MagneticButton from '@/components/ui/MagneticButton';

export default function CTAFooterClient({
  background,
  bookingEmail
}: {
  background: string;
  bookingEmail: string;
}) {
  const t = useTranslations('ctaFooter');

  return (
    <section
      id="book"
      className="relative overflow-hidden border-t border-white/5 py-20 sm:py-32"
    >
      <div className="absolute inset-0 -z-10">
        <Image
          src={background}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-top opacity-30 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/80 to-ink" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 120% at 50% 120%, rgba(46,150,176,0.30), transparent 60%)'
          }}
        />
      </div>

      <div className="edge mx-auto max-w-edge text-center">
        <Reveal
          as="h2"
          y={30}
          className="mx-auto max-w-4xl font-display text-[clamp(2.5rem,8vw,6.5rem)] leading-[0.95] tracking-[-0.02em] text-bone text-balance"
        >
          {t('heading')}
        </Reveal>

        <Reveal
          as="p"
          y={20}
          delay={0.15}
          className="mx-auto mt-7 max-w-md text-base leading-relaxed text-bone-dim"
        >
          {t('body')}
        </Reveal>

        <Reveal y={20} delay={0.3} className="mt-12">
          {/* TODO: route to the multi-step /book form once built. For now this opens
              a pre-filled booking email so the CTA is functional today. */}
          <MagneticButton
            href={`mailto:${bookingEmail}?subject=${encodeURIComponent('Booking request · Unicorn Tattoo')}`}
            variant="solid"
            strength={0.4}
          >
            {t('cta')}
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  );
}
