"use client";

import { Leaf, HeartHandshake, Sparkles, Recycle } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Photo } from "@/components/photo";
import { Reveal, RevealGroup, itemVariants } from "@/components/reveal";
import { images } from "@/lib/images";
import { motion } from "framer-motion";

export function AboutContent() {
  const { lang } = useLanguage();

  const story =
    lang === "el"
      ? [
          "Για περισσότερα από δύο δεκαετίες, η Green Cleaners φροντίζει τα ρούχα των οικογενειών της Αττικής σαν να ήταν δικά της. Ξεκινήσαμε με μία απλή πεποίθηση: ότι ο επαγγελματικός καθαρισμός μπορεί να είναι ταυτόχρονα αψεγάδιαστος και υπεύθυνος απέναντι στο περιβάλλον.",
          "Σήμερα, με 7 καταστήματα σε όλη την Αττική και την οικολογική τεχνολογία K.W.L., συνδυάζουμε τη μαστοριά της παλιάς σχολής με τα πιο σύγχρονα, πράσινα πρότυπα. Κάθε ρούχο, κάθε κουβέρτα, κάθε νυφικό περνά από τα χέρια ανθρώπων που νοιάζονται.",
        ]
      : [
          "For more than two decades, Green Cleaners has cared for the clothes of Attica's families as if they were our own. We started with a simple belief: that professional cleaning can be both impeccable and responsible towards the environment.",
          "Today, with 7 stores across Attica and the K.W.L. green technology, we blend old-school craftsmanship with the most modern, eco-friendly standards. Every garment, every blanket, every wedding dress passes through the hands of people who care.",
        ];

  const values = [
    {
      icon: Leaf,
      title: { el: "Οικολογία", en: "Ecology" },
      text: {
        el: "Πράσινη τεχνολογία και διαλύτες φιλικοί προς τον άνθρωπο και τη φύση.",
        en: "Green technology and solvents kind to people and nature.",
      },
    },
    {
      icon: Sparkles,
      title: { el: "Ποιότητα", en: "Quality" },
      text: {
        el: "Λεπτομερής έλεγχος σε κάθε στάδιο, για αποτέλεσμα που εντυπωσιάζει.",
        en: "Detailed control at every stage, for a result that impresses.",
      },
    },
    {
      icon: HeartHandshake,
      title: { el: "Εμπιστοσύνη", en: "Trust" },
      text: {
        el: "Χιλιάδες πελάτες μάς εμπιστεύονται τα πιο αγαπημένα τους ρούχα.",
        en: "Thousands of customers trust us with their most cherished garments.",
      },
    },
    {
      icon: Recycle,
      title: { el: "Υπευθυνότητα", en: "Responsibility" },
      text: {
        el: "Λιγότερο νερό, λιγότερη ενέργεια, μικρότερο αποτύπωμα.",
        en: "Less water, less energy, a smaller footprint.",
      },
    },
  ];

  return (
    <>
      <section className="pb-4 pt-2">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {story.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Photo
              src={images.about}
              alt={lang === "el" ? "Το κατάστημά μας" : "Our store"}
              className="aspect-[5/4] w-full rounded-[2rem] shadow-lift"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <motion.div
                key={v.title.el}
                variants={itemVariants}
                className="rounded-3xl border border-border/60 bg-card p-7 text-center shadow-soft"
              >
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                  <v.icon className="h-7 w-7" />
                </span>
                <h3 className="mt-5 font-serif text-lg font-semibold text-foreground">
                  {lang === "el" ? v.title.el : v.title.en}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {lang === "el" ? v.text.el : v.text.en}
                </p>
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
