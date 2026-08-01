import { Hero } from "@/components/Hero";
import { WelcomeStory } from "@/components/WelcomeStory";
import { Villas } from "@/components/Villas";
import { InstagramFeed } from "@/components/InstagramFeed";
import { Location } from "@/components/Location";
import { Testimonials } from "@/components/Testimonials";
import { ClosingCTA } from "@/components/ClosingCTA";

export default function Home() {
  return (
    <main>
      <Hero />
      <WelcomeStory />
      <Villas />
      <InstagramFeed />
      <Location />
      <Testimonials />
      <ClosingCTA />
    </main>
  );
}
