"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { stores } from "@/lib/data";
import { Marquee } from "@/components/marquee";

export function LocationMarquee() {
  const { tr } = useLanguage();
  const items = stores.map((s) => tr(s.area));
  return (
    <section className="noise relative overflow-hidden bg-ink py-7 text-ink-foreground" aria-hidden>
      <Marquee items={items} />
    </section>
  );
}
