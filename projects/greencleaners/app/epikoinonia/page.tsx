import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ContactContent } from "@/components/contact-content";
import { StoreMap } from "@/components/store-map";

export const metadata: Metadata = {
  title: "Επικοινωνία: Καλέστε, Γράψτε ή Κλείστε Παραλαβή",
  description:
    "Επικοινωνήστε με τη Green Cleaners. Τηλέφωνο & ραντεβού: 6988380756, email greencleanershellas@gmail.com. 7 καταστήματα στην Αττική.",
  alternates: { canonical: "/epikoinonia" },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow={{ el: "Επικοινωνία", en: "Contact" }}
        title={{ el: "Είμαστε εδώ για εσάς", en: "We're here for you" }}
        subtitle={{
          el: "Καλέστε, στείλτε μήνυμα στο WhatsApp ή κλείστε δωρεάν παραλαβή. Θα χαρούμε να σας εξυπηρετήσουμε.",
          en: "Call, message us on WhatsApp or book a free pickup. We'd love to help.",
        }}
      />
      <ContactContent />
      <StoreMap withHeading={false} />
    </>
  );
}
