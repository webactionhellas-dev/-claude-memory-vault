import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StoreMap } from "@/components/store-map";
import { CtaSection } from "@/components/cta-section";

export const metadata: Metadata = {
  title: "Καταστήματα: 7 Σημεία στην Αττική",
  description:
    "Βρείτε το πιο κοντινό κατάστημα Green Cleaners: Παιανία, Μαρούσι, Παγκράτι, Σπάτα, Νέα Μάκρη, Δουκίσσης Πλακεντίας & Ραφήνα. Διευθύνσεις, τηλέφωνα & χάρτης.",
  alternates: { canonical: "/katastimata" },
};

export default function StoresPage() {
  return (
    <>
      <PageHeader
        eyebrow={{ el: "Τα καταστήματά μας", en: "Our stores" }}
        title={{ el: "7 σημεία σε όλη την Αττική", en: "7 locations across Attica" }}
        subtitle={{
          el: "Επιλέξτε ένα κατάστημα στον χάρτη για διεύθυνση, τηλέφωνα και οδηγίες, ή ζητήστε δωρεάν παραλαβή από τον χώρο σας.",
          en: "Select a store on the map for its address, phones and directions, or request a free pickup from your premises.",
        }}
      />
      <StoreMap withHeading={false} />
      <CtaSection />
    </>
  );
}
