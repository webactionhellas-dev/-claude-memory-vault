import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ServicesSection } from "@/components/services-section";
import { EcoSection } from "@/components/eco-section";
import { CtaSection } from "@/components/cta-section";
import { services } from "@/lib/data";

export const metadata: Metadata = {
  title: "Υπηρεσίες: Οικολογικό Καθάρισμα & Πλύσιμο",
  description:
    "Στεγνό καθάρισμα με οικολογικό διαλύτη K.W.L., πλύσιμο & σιδέρωμα, καθαρισμός κουβερτών, παπλωμάτων & χαλιών, νυφικά, δέρμα, γούνα και αδιαβροχοποίηση.",
  alternates: { canonical: "/ypiresies" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow={{ el: "Οι υπηρεσίες μας", en: "Our services" }}
        title={{ el: "Φροντίδα για κάθε ύφασμα", en: "Care for every fabric" }}
        subtitle={{
          el: "Από τα καθημερινά ρούχα έως τα πολύτιμα κειμήλια, με εξειδικευμένες τεχνικές, οικολογική τεχνολογία και άψογο φινίρισμα.",
          en: "From everyday clothes to treasured heirlooms, with specialist techniques, green technology and an impeccable finish.",
        }}
      />
      <ServicesSection items={services} withHeading={false} className="!pt-4" />
      <EcoSection />
      <CtaSection />
    </>
  );
}
