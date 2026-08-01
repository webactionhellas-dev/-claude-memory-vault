import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { HowItWorks } from "@/components/how-it-works";
import { Pillars } from "@/components/pillars";
import { CtaSection } from "@/components/cta-section";

export const metadata: Metadata = {
  title: "Πώς Λειτουργεί: Δωρεάν Παραλαβή & Παράδοση",
  description:
    "Κλείστε ραντεβού, περνάμε από τον χώρο σας, καθαρίζουμε οικολογικά και παραδίδουμε φρέσκα. Δωρεάν παραλαβή & παράδοση για παραγγελίες άνω των €35.",
  alternates: { canonical: "/pos-leitourgei" },
};

export default function HowPage() {
  return (
    <>
      <PageHeader
        eyebrow={{ el: "Πώς λειτουργεί", en: "How it works" }}
        title={{ el: "Παραλαβή & παράδοση χωρίς κόπο", en: "Effortless pickup & delivery" }}
        subtitle={{
          el: "Εσείς αφιερώνεστε στις προτεραιότητές σας. Εμείς αναλαμβάνουμε τα ρούχα σας από τον χώρο σας και τα επιστρέφουμε καθαρά και σιδερωμένα.",
          en: "You focus on what matters. We collect your clothes from your premises and return them clean and pressed.",
        }}
      />
      <div className="pt-2">
        <HowItWorks />
      </div>
      <div className="pb-20">
        <Pillars />
      </div>
      <CtaSection />
    </>
  );
}
