import { LOCATIONS, SITE, type StudioLocation } from './content';

type SocialLinks = { instagram: string; facebook: string };

/**
 * schema.org TattooParlor (a LocalBusiness subtype) for each studio.
 * Emitted as JSON-LD per location for local SEO.
 */
function locationSchema(loc: StudioLocation, social: SocialLinks) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TattooParlor',
    '@id': `${SITE.url}/#${loc.id}`,
    name: `${SITE.name}, ${loc.city}`,
    image: `${SITE.url}/brand/og.jpg`,
    url: SITE.url,
    telephone: loc.phone,
    email: loc.email,
    priceRange: '€€€',
    foundingDate: String(SITE.foundedYear),
    sameAs: [social.instagram, social.facebook],
    address: {
      '@type': 'PostalAddress',
      streetAddress: loc.street,
      addressLocality: loc.city,
      postalCode: loc.postalCode,
      addressRegion: loc.region,
      addressCountry: 'GR'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: loc.geo.lat,
      longitude: loc.geo.lng
    },
    // TODO: client asset - confirm real opening hours per location
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '11:00',
        closes: '21:00'
      }
    ]
  };
}

export function getLocationSchemas(
  locations: StudioLocation[] = LOCATIONS,
  social: SocialLinks = SITE.social
) {
  return locations.map((loc) => locationSchema(loc, social));
}
