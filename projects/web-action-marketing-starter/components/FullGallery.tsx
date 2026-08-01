"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import { Lightbox } from "./ui/Lightbox";
import { ImageReveal } from "./ui/ImageReveal";
import { useLang } from "./LanguageProvider";
import { villas } from "@/lib/data";

// Interleave both villas' full photo sets for visual variety.
function buildPhotos(thalassaTag: string, anemosTag: string) {
  const th = villas[0].photos.map((src) => ({ src, tag: thalassaTag }));
  const an = villas[1].photos.map((src) => ({ src, tag: anemosTag }));
  const out: { src: string; tag: string }[] = [];
  const max = Math.max(th.length, an.length);
  for (let i = 0; i < max; i++) {
    if (th[i]) out.push(th[i]);
    if (an[i]) out.push(an[i]);
  }
  return out;
}

export function FullGallery() {
  const { t } = useLang();
  const photos = buildPhotos(t.villas.thalassa.name, t.villas.anemos.name);
  const [active, setActive] = useState<number | null>(null);
  const nav = (dir: 1 | -1) =>
    setActive((p) => (p === null ? p : (p + dir + photos.length) % photos.length));

  return (
    <section className="section bg-whisper">
      <div className="mx-auto max-w-content px-6 lg:px-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="group relative aspect-[4/5] overflow-hidden rounded-sm ring-1 ring-haze"
            >
              <ImageReveal className="absolute inset-0" delay={(i % 4) * 0.05}>
                <Image
                  src={p.src}
                  alt={p.tag}
                  fill
                  sizes="(max-width: 768px) 46vw, 24vw"
                  quality={90}
                  className="object-cover"
                />
              </ImageReveal>
              <div className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-300 group-hover:bg-ink/25 group-hover:opacity-100">
                <Expand className="text-white" size={22} />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="text-[0.6rem] uppercase tracking-wide2 text-white/90">{p.tag}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Lightbox items={photos} index={active} onClose={() => setActive(null)} onNav={nav} />
    </section>
  );
}
