import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PricingTable } from "@/components/pricing-table";
import { Faq } from "@/components/faq";

export const metadata: Metadata = {
  title: "Τιμές: Διαφανής Τιμοκατάλογος",
  description:
    "Διαφανείς, ενδεικτικές τιμές για στεγνό καθάρισμα, πλύσιμο, κουβέρτες, παπλώματα, χαλιά και εξειδικευμένες υπηρεσίες. Η τελική τιμή επιβεβαιώνεται στο κατάστημα.",
  alternates: { canonical: "/times" },
};

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow={{ el: "Τιμοκατάλογος", en: "Price list" }}
        title={{ el: "Διαφανείς τιμές, χωρίς εκπλήξεις", en: "Transparent pricing, no surprises" }}
        subtitle={{
          el: "Ενδεικτικές τιμές ανά κατηγορία. Η τελική τιμή επιβεβαιώνεται στο κατάστημα, ανάλογα με το ύφασμα και την κατάσταση του ρούχου.",
          en: "Indicative prices per category. The final price is confirmed in store, based on fabric and condition.",
        }}
      />
      <PricingTable withHeading={false} />
      <Faq />
    </>
  );
}
