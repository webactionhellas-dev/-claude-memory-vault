import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { FullGallery } from "@/components/FullGallery";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "A living wall of Aegean House, Villa Thalassa and Villa Anemos in full: interiors, pools, sunsets and Cycladic light.",
};

export default function GalleryPage() {
  return (
    <main>
      <PageHero
        pageKey="gallery"
        image="/media/villas/thalassa/th_04.webp"
        eyebrow="The Estate"
        title="Gallery"
        subtitle="Every corner of Villa Thalassa and Villa Anemos, in full."
      />
      <FullGallery />
    </main>
  );
}
