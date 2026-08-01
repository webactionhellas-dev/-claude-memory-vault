import type { Metadata } from "next";
import { EB_Garamond, Manrope } from "next/font/google";
import "./globals.css";

import { cn } from "@/lib/utils";
import { site } from "@/lib/site";
import { buildSchema } from "@/lib/schema";
import { LanguageProvider } from "@/components/providers/language-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { WhatsappButton } from "@/components/whatsapp-button";
import { ScrollProgress } from "@/components/scroll-progress";
import { Toaster } from "@/components/ui/sonner";

const sans = Manrope({
  subsets: ["latin", "greek"],
  variable: "--font-sans",
  display: "swap",
});

const serif = EB_Garamond({
  subsets: ["latin", "greek"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Green Cleaners · Οικολογικό Καθαριστήριο στην Αθήνα",
    template: "%s · Green Cleaners",
  },
  description:
    "Premium οικολογικό στεγνό καθάρισμα, υγιεινό πλύσιμο κουβερτών & παπλωμάτων, δωρεάν εποχιακή φύλαξη και δωρεάν παραλαβή. 7 καταστήματα στην Αθήνα & τα προάστια.",
  keywords: [
    "καθαριστήριο Αθήνα",
    "οικολογικό στεγνό καθάρισμα",
    "πλύσιμο κουβερτών",
    "καθαρισμός χαλιών",
    "καθαρισμός νυφικού",
    "dry cleaning Athens",
    "Green Cleaners",
    "Παιανία",
    "Μαρούσι",
    "Παγκράτι",
  ],
  authors: [{ name: "Green Cleaners" }],
  alternates: {
    canonical: "/",
    languages: { el: "/", en: "/" },
  },
  openGraph: {
    type: "website",
    locale: "el_GR",
    alternateLocale: "en_US",
    url: site.url,
    siteName: site.name,
    title: "Green Cleaners · Premium Οικολογικό Καθαριστήριο στην Αθήνα",
    description:
      "Οικολογικό καθάρισμα με σεβασμό στο περιβάλλον. Δωρεάν παραλαβή & εποχιακή φύλαξη. 7 καταστήματα στην Αττική.",
    // og:image is generated automatically by app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: "Green Cleaners · Premium Οικολογικό Καθαριστήριο",
    description: "Οικολογικό καθάρισμα, δωρεάν παραλαβή & φύλαξη. 7 καταστήματα στην Αττική.",
  },
  robots: { index: true, follow: true },
  // Favicon + apple icon are generated from app/icon.png and app/apple-icon.png
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const schema = buildSchema();
  return (
    <html lang="el" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className={cn(sans.variable, serif.variable, "min-h-screen bg-background")}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
        <LanguageProvider>
          <ScrollProgress />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main">{children}</main>
          <Footer />
          <WhatsappButton />
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
