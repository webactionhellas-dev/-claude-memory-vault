import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { AboutContent } from "@/components/about-content";
import { Testimonials } from "@/components/testimonials";
import { CtaSection } from "@/components/cta-section";

export const metadata: Metadata = {
  title: "Σχετικά: Η Ιστορία μας",
  description:
    "Πάνω από 20 χρόνια εμπειρίας στον οικολογικό καθαρισμό. 7 καταστήματα στην Αττική, τεχνολογία K.W.L. και αφοσίωση στην ποιότητα και το περιβάλλον.",
  alternates: { canonical: "/sxetika" },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow={{ el: "Σχετικά με εμάς", en: "About us" }}
        title={{ el: "Φροντίδα με μεράκι, εδώ και δεκαετίες", en: "Care with heart, for decades" }}
        subtitle={{
          el: "Premium καθαρισμός με σεβασμό στον άνθρωπο, στο ύφασμα και στο περιβάλλον.",
          en: "Premium cleaning with respect for people, fabric and the environment.",
        }}
      />
      <AboutContent />
      <Testimonials />
      <CtaSection />
    </>
  );
}
