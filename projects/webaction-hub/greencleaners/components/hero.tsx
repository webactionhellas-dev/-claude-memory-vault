"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import { ArrowRight, Leaf, ShieldCheck, Star, Truck } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { BookingModal } from "@/components/booking-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Magnetic } from "@/components/magnetic";
import { CountUp } from "@/components/count-up";
import { Photo } from "@/components/photo";
import { Seal } from "@/components/seal";
import { images } from "@/lib/images";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const word: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export function Hero() {
  const { t, lang } = useLanguage();
  const reduced = useReducedMotion();

  // Pointer parallax for the visual cluster.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 18 });
  const sy = useSpring(py, { stiffness: 120, damping: 18 });
  const cardX = useTransform(sx, (v) => v * -14);
  const cardY = useTransform(sy, (v) => v * -14);
  const card2X = useTransform(sx, (v) => v * -26);
  const card2Y = useTransform(sy, (v) => v * -26);
  const sealX = useTransform(sx, (v) => v * 12);
  const sealY = useTransform(sy, (v) => v * 12);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - (r.left + r.width / 2)) / (r.width / 2));
    py.set((e.clientY - (r.top + r.height / 2)) / (r.height / 2));
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  const titleWords = t.hero.title.split(" ");
  const accentWords = t.hero.titleAccent.split(" ");

  return (
    <section className="relative overflow-hidden pt-32 pb-16 md:pt-44 md:pb-24">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="aurora -right-24 -top-24 h-[34rem] w-[34rem] bg-sage/50" />
        <div className="aurora -left-32 top-40 h-[28rem] w-[28rem] bg-primary/12" style={{ animationDelay: "-7s" }} />
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary)/0.05)_1px,transparent_1px)] [background-size:28px_28px] opacity-70" />
      </div>

      <div className="container grid items-center gap-14 lg:grid-cols-[1.08fr_0.92fr]">
        {/* Copy */}
        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="sage" className="px-4 py-1.5">
              <Leaf className="h-3.5 w-3.5" />
              {t.hero.eyebrow}
            </Badge>
          </motion.div>

          <motion.h1
            variants={container}
            initial="hidden"
            animate="show"
            className="display mt-6 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.08] text-foreground"
          >
            {titleWords.map((w, i) => (
              <motion.span key={i} variants={word} className="inline-block">
                {w}&nbsp;
              </motion.span>
            ))}
            {/* Native underline hugs each line's text exactly (no overshoot when the
                accent wraps onto multiple lines on mobile). */}
            {accentWords.map((w, i) => (
              <motion.span
                key={i}
                variants={word}
                className="inline-block font-serif italic text-primary underline decoration-gold decoration-[3px] underline-offset-[0.16em]"
              >
                {w}&nbsp;
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.62 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Magnetic>
              <BookingModal>
                <Button size="xl">
                  {t.hero.ctaPrimary}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </BookingModal>
            </Magnetic>
            <Button asChild size="xl" variant="outline">
              <a href="#services">{t.hero.ctaSecondary}</a>
            </Button>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border/70 pt-8"
          >
            {[
              { node: <CountUp to={25} suffix="+" />, label: t.hero.stat1 },
              { node: <CountUp to={7} />, label: t.hero.stat2 },
              { node: <CountUp to={98} suffix="%" />, label: t.hero.stat3 },
            ].map((s, i) => (
              <div key={i}>
                <dt className="font-serif text-3xl font-semibold text-primary">{s.node}</dt>
                <dd className="mt-1 text-xs leading-snug text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* Visual cluster */}
        <motion.div
          className="relative mx-auto w-full max-w-md"
          onMouseMove={onMove}
          onMouseLeave={reset}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Arched editorial image with a "freshness reveal" on entrance */}
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2rem] border border-border/60 shadow-lift">
            <motion.div
              className="h-full w-full"
              initial={{ filter: reduced ? "none" : "saturate(0.5) brightness(0.8)" }}
              animate={{ filter: "saturate(1) brightness(1)" }}
              transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Photo
                src={images.garments}
                alt={lang === "el" ? "Φροντίδα ρούχων υψηλών προδιαγραφών" : "Premium garment care"}
                className="h-full w-full"
                sizes="(max-width: 1024px) 90vw, 460px"
                priority
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
            {!reduced && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 h-[16%]"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, hsl(var(--gold) / 0.45), transparent)",
                }}
                initial={{ top: "-18%", opacity: 0 }}
                animate={{ top: "118%", opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.25, delay: 0.4, ease: "easeInOut" }}
              />
            )}
          </div>

          {/* Rotating seal */}
          <motion.div
            style={{ x: sealX, y: sealY }}
            className="absolute -bottom-7 -left-6 flex h-28 w-28 items-center justify-center rounded-full bg-background text-primary shadow-lift sm:h-32 sm:w-32"
          >
            <Seal className="w-[78%]" />
          </motion.div>

          {/* Floating: free pickup (idle float on all devices, parallax on desktop) */}
          <div
            className="absolute -left-3 top-10 motion-safe:animate-float sm:-left-8"
            style={{ animationDelay: "-1.5s" }}
          >
            <motion.div
              style={{ x: cardX, y: cardY }}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-lift backdrop-blur"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Truck className="h-5 w-5" />
              </span>
              <div className="text-sm">
                <p className="font-semibold leading-tight text-foreground">{t.nav.book}</p>
                <p className="text-xs text-muted-foreground">{t.common.from} 0€</p>
              </div>
            </motion.div>
          </div>

          {/* Floating: rating */}
          <div className="absolute -right-3 bottom-12 motion-safe:animate-float sm:-right-8">
            <motion.div
              style={{ x: card2X, y: card2Y }}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-lift backdrop-blur"
            >
              <div className="text-sm">
                <div className="flex gap-0.5 text-gold">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5" fill="currentColor" stroke="none" />
                  ))}
                </div>
                <p className="mt-1 text-xs font-medium text-foreground">500+ {lang === "el" ? "πελάτες" : "clients"}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                <ShieldCheck className="h-5 w-5" />
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
