import { site } from "@/lib/site";
import { stores, services } from "@/lib/data";
import { telHref } from "@/lib/utils";

/**
 * LocalBusiness (DryCleaningOrLaundry) JSON-LD with all 7 branches as
 * sub-organisations, plus a Service catalogue. Helps Google show rich
 * results, the local pack and store knowledge panels.
 */
export function buildSchema() {
  const departments = stores.map((s) => ({
    "@type": "DryCleaningOrLaundry",
    name: `${site.name} · ${s.name.el}`,
    image: `${site.url}/opengraph-image`,
    telephone: telHref(s.phones[0]),
    address: {
      "@type": "PostalAddress",
      streetAddress: s.address.el,
      addressLocality: s.area.el,
      addressRegion: "Αττική",
      addressCountry: "GR",
    },
    geo: { "@type": "GeoCoordinates", latitude: s.coords.lat, longitude: s.coords.lng },
    openingHours: "Mo-Fr 08:00-20:00, Sa 09:00-15:00",
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "DryCleaningOrLaundry",
        "@id": `${site.url}/#business`,
        name: site.legalName,
        alternateName: site.name,
        url: site.url,
        email: site.email,
        telephone: telHref(site.bookingPhone),
        image: `${site.url}/opengraph-image`,
        priceRange: "€€",
        currenciesAccepted: "EUR",
        paymentAccepted: "Cash, Credit Card",
        areaServed: { "@type": "AdministrativeArea", name: "Αττική, Ελλάδα" },
        address: {
          "@type": "PostalAddress",
          streetAddress: stores[0].address.el,
          addressLocality: stores[0].area.el,
          addressRegion: "Αττική",
          addressCountry: "GR",
        },
        geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
        department: departments,
        makesOffer: services.map((sv) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: sv.title.el, description: sv.short.el },
        })),
        sameAs: [site.social.instagram, site.social.facebook],
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        inLanguage: ["el", "en"],
        publisher: { "@id": `${site.url}/#business` },
      },
    ],
  };
}
