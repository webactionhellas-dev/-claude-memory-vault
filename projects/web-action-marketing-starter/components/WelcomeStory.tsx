"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Reveal } from "./ui/Reveal";
import { ImageReveal } from "./ui/ImageReveal";
import { useLang } from "./LanguageProvider";

export function WelcomeStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const { t } = useLang();

  return (
    <section id="welcome" className="section bg-whisper">
      <div className="mx-auto grid max-w-content items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20 lg:px-10">
        {/* Text */}
        <div>
          <Reveal>
            <span className="eyebrow">{t.welcome.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-6 font-display text-4xl font-light leading-tight md:text-6xl">
              {t.welcome.titleTop}
              <span className="block text-sea-gradient">{t.welcome.titleAccent}</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-lg text-slate md:text-lg md:leading-relaxed">
              {t.welcome.para1}
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-5 max-w-lg text-slate md:leading-relaxed">
              {t.welcome.para2}
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
              {t.welcome.trust.map((badge) => (
                <span key={badge} className="text-[0.68rem] uppercase tracking-wide2 text-azure">
                  {badge}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Image with parallax + framing */}
        <div className="relative">
          <ImageReveal className="relative aspect-[4/5] img-soft-edges">
            <motion.div style={{ y: imgY }} className="absolute inset-[-8%]">
              <Image
                src="/media/villas/anemos/an_03_4k.webp"
                alt="Infinity pool over the panorama of Mykonos Town and the Aegean, Kastro"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                quality={90}
                className="object-cover opacity-90"
              />
            </motion.div>
          </ImageReveal>
          {/* Floating stat card. On mobile it sits inside the image (bottom-left);
              on md+ it floats outside against the whitespace. Always visible. */}
          <div className="glass absolute bottom-4 left-4 max-w-[190px] rounded-sm p-4 md:-bottom-6 md:-left-6 md:max-w-[220px] md:p-5">
            <p className="font-display text-3xl font-light text-azure">{t.welcome.statValue}</p>
            <p className="mt-1 text-xs uppercase tracking-wide2 text-slate">
              {t.welcome.statLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
