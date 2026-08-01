"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Expand } from "lucide-react";
import { Reveal } from "./ui/Reveal";
import { Lightbox } from "./ui/Lightbox";
import { gallery } from "@/lib/data";
import { cn } from "@/lib/utils";

const spanClass: Record<string, string> = {
  big: "col-span-2 row-span-2",
  wide: "col-span-2 row-span-1",
  tall: "col-span-1 row-span-2",
  std: "col-span-1 row-span-1",
};

export function Gallery() {
  const [active, setActive] = useState<number | null>(null);

  const nav = (dir: 1 | -1) =>
    setActive((p) => (p === null ? p : (p + dir + gallery.length) % gallery.length));

  return (
    <section id="gallery" className="section bg-whisper scroll-mt-24">
      <div className="mx-auto max-w-content px-6 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <Reveal>
              <span className="eyebrow">The Gallery</span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-6 font-display text-4xl font-light md:text-6xl">
                Moments that sell themselves
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-sm text-slate">
              A living wall of the estate: sunsets, interiors, drone frames and
              lifestyle moments. Tap any frame to open it full-screen.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid grid-flow-dense auto-rows-[150px] grid-cols-2 gap-3 md:auto-rows-[210px] md:grid-cols-4">
          {gallery.map((item, i) => (
            <motion.button
              key={i}
              onClick={() => setActive(i)}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: (i % 4) * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "group relative overflow-hidden rounded-sm ring-1 ring-haze",
                spanClass[item.span],
              )}
            >
              {item.src && !item.placeholder ? (
                <Image
                  src={item.src}
                  alt={item.tag}
                  fill
                  sizes="(max-width: 768px) 92vw, 46vw"
                  quality={90}
                  className="object-cover"
                />
              ) : (
                <div className="ph h-full w-full">
                  <span className="ph-tag">@mykonosprestigevillas · {item.tag}</span>
                </div>
              )}

              {/* hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-300 group-hover:bg-ink/30 group-hover:opacity-100">
                <Expand className="text-white" size={24} />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="text-[0.62rem] uppercase tracking-wide2 text-white/90">
                  {item.tag}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <Lightbox items={gallery} index={active} onClose={() => setActive(null)} onNav={nav} />
    </section>
  );
}
