import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Experiences } from "@/components/Experiences";
import { Services } from "@/components/Services";

export const metadata: Metadata = {
  title: "Experiences & Services",
  description:
    "Private chef, yacht charters, helicopter transfers, wellness, concierge and more. Every desire, quietly arranged at Mykonos Prestige Villas.",
};

export default function ExperiencesPage() {
  return (
    <main>
      <PageHero
        pageKey="experiences"
        image="/media/villas/thalassa/th_20.webp"
        eyebrow="The Estate"
        title="Experiences & Services"
        subtitle="A dedicated concierge turns the whole island into an extension of your villa."
      />
      <Experiences />
      <Services bg="bg-white" />
    </main>
  );
}
