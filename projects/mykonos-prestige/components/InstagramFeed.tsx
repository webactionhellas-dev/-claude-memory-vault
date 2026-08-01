"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Instagram, Play } from "lucide-react";
import { Reveal } from "./ui/Reveal";
import { useLang } from "./LanguageProvider";
import { site } from "@/lib/data";
import type { IgPost } from "@/lib/instagram";

export function InstagramFeed() {
  const { t } = useLang();
  const [posts, setPosts] = useState<IgPost[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/instagram?limit=8")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setPosts(d.posts ?? []);
      })
      .catch(() => alive && setPosts([]));
    return () => {
      alive = false;
    };
  }, []);

  const skeleton = Array.from({ length: 8 });

  return (
    <section id="journal" className="section bg-white scroll-mt-24">
      <div className="mx-auto max-w-content px-6 lg:px-10">
        <div className="flex flex-col items-center text-center">
          <Reveal>
            <span className="eyebrow justify-center">{t.instagram.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 font-display text-4xl font-light md:text-6xl">
              {t.instagram.title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <a
              href={site.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm text-azure transition hover:text-azure-deep"
            >
              <Instagram size={17} /> {site.instagramHandle}
            </a>
          </Reveal>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(posts ?? skeleton).map((post, i) => {
            const p = post as IgPost | undefined;
            const real = p && p.mediaUrl && !p.placeholder;
            return (
              <a
                key={p?.id ?? i}
                href={p?.permalink ?? site.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square overflow-hidden rounded-sm ring-1 ring-haze"
              >
                {real ? (
                  <Image
                    src={p!.mediaUrl}
                    alt={p!.caption?.slice(0, 80) || "Instagram post"}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
              quality={90}
                    className="object-cover"
                  />
                ) : (
                  <div className="ph h-full w-full items-center justify-center">
                    <span className="ph-tag !m-0">@mykonosprestigevillas</span>
                  </div>
                )}

                {/* video badge */}
                {p?.mediaType === "VIDEO" && (
                  <span className="absolute right-2 top-2 rounded-full bg-ink/60 p-1.5 text-white backdrop-blur-sm">
                    <Play size={12} fill="currentColor" />
                  </span>
                )}

                {/* hover caption */}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/80 via-ink/10 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <Instagram size={16} className="text-white" />
                </div>
              </a>
            );
          })}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-6 text-center text-[0.62rem] uppercase tracking-wide2 text-slate/70">
            {t.instagram.note}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
