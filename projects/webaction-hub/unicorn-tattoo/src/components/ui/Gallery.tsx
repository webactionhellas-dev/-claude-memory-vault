'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { lockScroll, unlockScroll } from '@/lib/scroll-lock';
import { cn } from '@/lib/utils';

export interface GalleryPhoto {
  id: string;
  src: string;
  alt: string;
  ar?: number;
  tag?: string;
  caption?: string;
}

export interface GalleryFilter {
  id: string;
  label: string;
}

export default function Gallery({
  photos,
  filters,
  className
}: {
  photos: GalleryPhoto[];
  filters?: GalleryFilter[];
  className?: string;
}) {
  const [active, setActive] = useState('all');
  const [index, setIndex] = useState<number | null>(null);

  const shown =
    active === 'all' ? photos : photos.filter((p) => p.tag === active);

  const close = useCallback(() => setIndex(null), []);
  const go = useCallback(
    (dir: number) =>
      setIndex((i) => (i === null ? i : (i + dir + shown.length) % shown.length)),
    [shown.length]
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    lockScroll();
    window.addEventListener('keydown', onKey);
    return () => {
      unlockScroll();
      window.removeEventListener('keydown', onKey);
    };
  }, [index, close, go]);

  return (
    <div className={className}>
      {filters && filters.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-2.5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setActive(f.id);
                setIndex(null);
              }}
              className={cn(
                'inline-flex min-h-11 items-center rounded-full border px-5 text-[11px] uppercase tracking-kicker transition-colors duration-300',
                active === f.id
                  ? 'border-violet bg-violet/15 text-bone'
                  : 'border-white/12 text-bone-dim hover:border-white/40 hover:text-bone'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Masonry - preserves each photo's real aspect ratio */}
      <div className="columns-2 gap-2.5 sm:columns-3 sm:gap-3 lg:columns-4">
        {shown.map((p, i) => (
          <button
            key={`${active}-${p.id}`}
            onClick={() => setIndex(i)}
            className="group relative mb-2.5 block w-full break-inside-avoid overflow-hidden bg-ink-700 sm:mb-3"
            aria-label={p.alt}
          >
            <div className="relative w-full" style={{ aspectRatio: String(p.ar ?? 0.72) }}>
              <Image
                src={p.src}
                alt={p.alt}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-700 ease-ink group-hover:scale-[1.04]"
              />
            </div>
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            {p.caption && (
              <span className="pointer-events-none absolute bottom-3 left-3 z-10 text-[10px] uppercase tracking-kicker text-bone opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                {p.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox - single image with prev/next; smooth fade + settle on each
          change. Plain CSS; framer stays out of this bundle. */}
      {index !== null && shown[index] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/95 backdrop-blur-sm animate-[fadein_0.25s_ease]"
          onClick={close}
        >
          <button
            onClick={close}
            aria-label="Close"
            className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-bone transition-colors hover:border-violet hover:text-violet"
          >
            ✕
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Previous"
            className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-bone transition-colors hover:border-violet hover:text-violet sm:left-8"
          >
            ←
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Next"
            className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-bone transition-colors hover:border-violet hover:text-violet sm:right-8"
          >
            →
          </button>

          <div
            className="relative h-[80vh] w-[92vw] max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              key={shown[index].id}
              src={shown[index].src}
              alt={shown[index].alt}
              fill
              sizes="92vw"
              className="object-contain animate-[lightboxIn_0.5s_cubic-bezier(0.22,1,0.36,1)]"
            />
          </div>

          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-kicker text-bone-dim">
            {index + 1} / {shown.length}
          </span>
        </div>
      )}
    </div>
  );
}
