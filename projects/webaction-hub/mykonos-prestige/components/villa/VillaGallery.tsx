"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import { Lightbox } from "../ui/Lightbox";
import { ImageReveal } from "../ui/ImageReveal";

export function VillaGallery({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState<number | null>(null);
  const items = photos.map((src, i) => ({ src, tag: `${name} · ${String(i + 1).padStart(2, "0")}` }));
  const nav = (dir: 1 | -1) =>
    setActive((p) => (p === null ? p : (p + dir + items.length) % items.length));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {photos.map((src, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className="group relative aspect-[4/5] overflow-hidden rounded-sm ring-1 ring-haze"
          >
            <ImageReveal className="absolute inset-0" delay={(i % 3) * 0.05}>
              <Image
                src={src}
                alt={`${name} ${i + 1}`}
                fill
                sizes="(max-width: 768px) 92vw, 46vw"
                quality={90}
                className="object-cover"
              />
            </ImageReveal>
            <div className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-300 group-hover:bg-ink/25 group-hover:opacity-100">
              <Expand className="text-white" size={22} />
            </div>
          </button>
        ))}
      </div>

      <Lightbox items={items} index={active} onClose={() => setActive(null)} onNav={nav} />
    </>
  );
}
