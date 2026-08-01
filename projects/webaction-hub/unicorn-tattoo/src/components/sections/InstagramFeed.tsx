import { getTranslations } from 'next-intl/server';
import Reveal from '@/components/ui/Reveal';
import { SITE } from '@/lib/content';
import { getCms } from '@/lib/cms/data';
import { cn } from '@/lib/utils';

interface FeedPost {
  id: string;
  src: string;
  href: string;
  alt: string;
}

function IgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MutedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

/**
 * Live Instagram feed via Behold (https://behold.so) - a free, no-scrape feed.
 * 1. Create a feed at behold.so, connect @unicorn.tattoo, copy the Feed ID.
 * 2. Set BEHOLD_FEED_ID in .env - the real colour posts then render here,
 *    auto-updating. Until then, the studio's own photos are the fallback.
 */
async function getLivePosts(): Promise<FeedPost[] | null> {
  const id = process.env.BEHOLD_FEED_ID;
  if (!id) return null;
  try {
    const res = await fetch(`https://feeds.behold.so/${id}`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const posts = Array.isArray(data) ? data : data.posts;
    if (!Array.isArray(posts)) return null;
    // A video feature tile leads the grid; the singles fill the rest. Nine
    // real posts give a clean desktop grid (feature 2x2 + 8 singles = 12).
    const take = posts.length >= 9 ? 9 : posts.length >= 5 ? 5 : 0;
    if (take === 0) return null;
    return posts.slice(0, take).map((p: Record<string, unknown>, i: number) => ({
      id: String(p.id ?? i),
      src:
        ((p.sizes as Record<string, { mediaUrl?: string }>)?.medium?.mediaUrl) ??
        (p.mediaUrl as string) ??
        (p.thumbnailUrl as string),
      href: (p.permalink as string) ?? SITE.social.instagram,
      alt: (p.prunedCaption as string)?.slice(0, 100) || 'Unicorn Tattoo · Instagram'
    }));
  } catch {
    return null;
  }
}

export default async function InstagramFeed() {
  const t = await getTranslations('instagram');
  const cms = await getCms();
  const live = await getLivePosts();
  const posts: FeedPost[] =
    live ??
    cms.instagram.map((p) => ({
      id: p.id,
      src: p.src,
      href: p.href,
      alt: 'Unicorn Tattoo · studio'
    }));

  // The video reel leads; up to eight photos fill the rest of the bento grid.
  const singles = posts.slice(0, 8);
  const igUrl = cms.social.instagram;
  const handle = cms.social.instagramHandle;

  return (
    <section id="instagram" className="border-t border-white/5 bg-ink-900">
      <div className="edge mx-auto max-w-edge py-24 sm:py-32">
        {/* Profile header - avatar, handle, and a follow action. */}
        <div className="mb-12 flex flex-col gap-8 sm:mb-14 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${handle} on Instagram`}
              className="relative block shrink-0 rounded-full p-[2.5px]"
              style={{
                background:
                  'conic-gradient(from 215deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5, #feda75)'
              }}
            >
              <span className="block rounded-full bg-ink-900 p-[3px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo-mark.png"
                  alt=""
                  className="h-14 w-14 rounded-full bg-ink object-contain p-2"
                />
              </span>
            </a>
            <div>
              <Reveal as="p" className="eyebrow mb-2 flex items-center gap-3">
                {t('kicker')}
              </Reveal>
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ink-link font-display text-2xl leading-none text-bone sm:text-[1.9rem]"
              >
                {handle}
              </a>
              <p className="mt-2.5 text-sm text-bone-dim">{t('heading')}</p>
            </div>
          </div>

          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex w-fit items-center gap-2.5 rounded-full border border-white/15 px-6 py-4 text-[11px] uppercase tracking-kicker text-bone transition-colors duration-300 hover:border-violet hover:bg-violet/10"
          >
            <IgIcon className="h-4 w-4" />
            {t('cta')}
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
          </a>
        </div>

        {/* Bento feed - a video reel leads, photos fill the rest. */}
        <div className="grid auto-rows-[42vw] grid-cols-2 gap-2.5 [grid-auto-flow:dense] sm:auto-rows-[22vw] sm:grid-cols-4 sm:gap-3 lg:auto-rows-[13.5vw]">
          {/* Feature: autoplaying studio reel */}
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${handle} on Instagram`}
            className="group relative col-span-2 row-span-2 overflow-hidden bg-ink-700"
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              poster="/images/bg/hero-poster.jpg"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-ink group-hover:scale-105"
            >
              <source src="/video/reel.mp4" type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/20" />
            <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink/45 backdrop-blur">
              <MutedIcon className="h-4 w-4 text-bone" />
            </span>
            <span className="absolute bottom-4 left-4 flex items-center gap-2 text-[11px] uppercase tracking-kicker text-bone">
              <IgIcon className="h-4 w-4 text-violet" />
              <span className="opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                {t('cta')}
              </span>
            </span>
          </a>

          {/* Singles */}
          {singles.map((post) => (
            <a
              key={post.id}
              href={post.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={post.alt}
              className={cn('group relative overflow-hidden bg-ink-700')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.src}
                alt={post.alt}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-ink group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-ink/50 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <IgIcon className="h-6 w-6 text-bone" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
