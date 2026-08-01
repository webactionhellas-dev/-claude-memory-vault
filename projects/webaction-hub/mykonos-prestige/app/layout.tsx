import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { GFS_Didot, Inter } from "next/font/google";
import { site } from "@/lib/data";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingCTA } from "@/components/FloatingCTA";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

/* Brand fonts, self-hosted from the client's own licensed files. */
const hatton = localFont({
  variable: "--font-hatton",
  display: "swap",
  src: [
    { path: "../public/fonts/Hatton/PP_Hatton_Ultralight_200.otf", weight: "200", style: "normal" },
    { path: "../public/fonts/Hatton/Hatton-Light.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/Hatton/PP_Hatton_Medium_500.otf", weight: "500", style: "normal" },
  ],
});

const averta = localFont({
  variable: "--font-averta",
  display: "swap",
  src: [{ path: "../public/fonts/Averta/AvertaStd-Regular.ttf", weight: "400", style: "normal" }],
});

/* Greek fonts — the brand fonts (Hatton/Averta) carry no Greek. On Greek pages
   (html[lang="el"]) globals.css routes titles/body straight to these so they
   match the English style: GFS Didot, a native Greek didone that echoes Hatton's
   high-contrast look, for titles; Inter for body. English keeps Hatton/Averta.
   (A plain font-stack fallback is not enough because next/font's metric fallback
   for Hatton also covers Greek and would intercept it before GFS Didot.) */
const greekDisplay = GFS_Didot({
  weight: "400",
  subsets: ["greek"],
  variable: "--font-greek-display",
  display: "swap",
});
const greekBody = Inter({
  subsets: ["greek"],
  variable: "--font-greek-body",
  display: "swap",
});

const description =
  "Two ultra-luxury private villas above Kastro, Mykonos. Villa Thalassa (500m²) and Villa Anemos (260m²). 180° Aegean sunset views, private chef, concierge and helipad access. Reserve your private sunset.";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${site.domain}`),
  title: {
    default: "Mykonos Prestige Villas · Luxury Private Villas in Kastro, Mykonos",
    template: "%s · Mykonos Prestige Villas",
  },
  description,
  keywords: [
    "Mykonos luxury villas",
    "private villas Kastro",
    "Mykonos villa rental",
    "luxury villa Mykonos sunset",
    "Villa Thalassa Mykonos",
    "Villa Anemos Mykonos",
    "private chef Mykonos villa",
    "Mykonos villa with pool",
    "Delos view villa",
  ],
  authors: [{ name: site.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Mykonos Prestige Villas · Your Private Sunset",
    description,
    url: `https://${site.domain}`,
    siteName: site.name,
    images: [{ url: "/media/real/og.webp", width: 1200, height: 630, alt: site.name }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mykonos Prestige Villas · Your Private Sunset",
    description,
    images: ["/media/real/og.webp"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F6F9FB",
  width: "device-width",
  initialScale: 1,
};

// Rich result / SEO: LodgingBusiness structured data.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: site.name,
  description,
  url: `https://${site.domain}`,
  email: site.email,
  telephone: `+${site.whatsapp}`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Faros Armenistis, Fanari",
    addressLocality: "Mykonos",
    postalCode: "846 00",
    addressCountry: "GR",
  },
  image: `https://${site.domain}/media/real/og.webp`,
  priceRange: "€€€€",
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Infinity Pool", value: true },
    { "@type": "LocationFeatureSpecification", name: "Private Chef", value: true },
    { "@type": "LocationFeatureSpecification", name: "Concierge", value: true },
    { "@type": "LocationFeatureSpecification", name: "Sea View", value: true },
  ],
  sameAs: [site.instagram],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const saved = cookieStore.get("mpv-locale")?.value;
  const locale: "en" | "el" = saved === "el" ? "el" : "en";
  return (
    <html
      lang={locale}
      className={`${hatton.variable} ${averta.variable} ${greekDisplay.variable} ${greekBody.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <LanguageProvider initialLocale={locale}>
          <FloatingCTA />
          <Navbar />
          {children}
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
