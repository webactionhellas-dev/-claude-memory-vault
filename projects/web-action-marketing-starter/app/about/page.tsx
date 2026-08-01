import type { Metadata } from "next";
import { about, site } from "@/lib/data";
import { AboutBody } from "@/components/about/AboutBody";

export const metadata: Metadata = {
  title: "About Us · The Story Behind Aegean House",
  description: about.lede,
  openGraph: {
    title: "About · Aegean House",
    description: about.lede,
    images: [{ url: about.heroImage, width: 1200, height: 630, alt: site.name }],
  },
};

export default function AboutPage() {
  return <AboutBody />;
}
