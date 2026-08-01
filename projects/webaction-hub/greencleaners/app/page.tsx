import { Hero } from "@/components/hero";
import { Pillars } from "@/components/pillars";
import { ServicesSection } from "@/components/services-section";
import { LocationMarquee } from "@/components/location-marquee";
import { EcoSection } from "@/components/eco-section";
import { StatsBand } from "@/components/stats-band";
import { HowItWorks } from "@/components/how-it-works";
import { PricingTable } from "@/components/pricing-table";
import { StoreMap } from "@/components/store-map";
import { Testimonials } from "@/components/testimonials";
import { Faq } from "@/components/faq";
import { CtaSection } from "@/components/cta-section";
import { featuredServices } from "@/lib/data";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Pillars />
      <ServicesSection items={featuredServices} bento index="01" />
      <LocationMarquee />
      <EcoSection />
      <StatsBand />
      <HowItWorks index="02" />
      <PricingTable index="03" />
      <StoreMap index="04" />
      <Testimonials index="05" />
      <Faq index="06" />
      <CtaSection />
    </>
  );
}
