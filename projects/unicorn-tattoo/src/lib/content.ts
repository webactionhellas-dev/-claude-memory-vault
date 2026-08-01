/**
 * Central, editable content layer.
 * Swap copy / photos here - components read from this single source.
 * Translatable strings live in `src/messages/{el,en}.json`; this file holds
 * structured, mostly language-neutral facts (NAP, handles, asset paths).
 */

export const SITE = {
  name: 'Unicorn Tattoo',
  foundedYear: 2001,
  url: 'https://unicorntattoo.gr',
  social: {
    instagram: 'https://www.instagram.com/unicorn.tattoo/',
    instagramHandle: '@unicorn.tattoo',
    facebook: 'https://www.facebook.com/unicorntattooglyfada',
    facebookHandle: 'unicorntattooglyfada'
  }
} as const;

export type LocationId = 'glyfada' | 'corfu';

export interface StudioLocation {
  id: LocationId;
  city: string;
  cityEl: string;
  street: string;
  streetEl: string;
  postalCode: string;
  region: string;
  note?: string;
  noteEl?: string;
  phone: string;
  phoneHref: string;
  email: string;
  geo: { lat: number; lng: number };
  /** The studio's real Google Business listing (ftid = hex place id from the
   *  Maps place URL; name = listing title). Drives the embedded map card. */
  place: { ftid: string; name: string };
  mapsUrl: string;
}

export const LOCATIONS: StudioLocation[] = [
  {
    id: 'glyfada',
    city: 'Glyfada',
    cityEl: 'Γλυφάδα',
    street: 'Aggelou Metaxa 33',
    streetEl: 'Αγγέλου Μεταξά 33',
    postalCode: '16674',
    region: 'Attica',
    note: 'Florida Mall · ground floor',
    noteEl: 'Florida Mall · ισόγειο',
    phone: '+30 211 750 6343',
    phoneHref: 'tel:+302117506343',
    email: 'unicorntattoo2001@gmail.com',
    // The Google Business listing's own coordinates (Florida Mall, Metaxa 33)
    geo: { lat: 37.8620259, lng: 23.7536762 },
    place: {
      ftid: '0x14a1bfd1bbc938bb:0x6498f003fc02103e',
      name: 'Unicorn Tattoo & Body Piercing Studio in Glyfada'
    },
    // Opens the real listing (reviews, photos, directions) via its CID
    mapsUrl: 'https://maps.google.com/?cid=7248807500156375102'
  },
  {
    id: 'corfu',
    city: 'Corfu',
    cityEl: 'Κέρκυρα',
    street: 'Eugeniou Voulgareos 26, 1st floor',
    streetEl: 'Ευγενίου Βουλγάρεως 26, 1ος όροφος',
    postalCode: '49100',
    region: 'Corfu',
    phone: '+30 266 102 0730',
    phoneHref: 'tel:+302661020730',
    email: 'unicorncorfu@gmail.com',
    // The Google Business listing's own coordinates (Voulgareos, old town)
    geo: { lat: 39.6237447, lng: 19.9227925 },
    place: {
      ftid: '0x135b5ddc92800a0d:0xb4e3aee5632947ea',
      name: 'Unicorn Tattoo Corfu And Body Piercing'
    },
    mapsUrl: 'https://maps.google.com/?cid=13034454046774740970'
  }
];

export type SpecialtyId =
  | 'realistic'
  | 'graphic'
  | 'geometric'
  | 'lettering'
  | 'piercing';

export const SPECIALTIES: SpecialtyId[] = [
  'realistic',
  'graphic',
  'geometric',
  'lettering',
  'piercing'
];

/** Build a /public path to one of the 32 real piercing photos. */
export function workSrc(n: number) {
  return `/images/work/work-${String(n).padStart(2, '0')}.jpg`;
}

/** Build a /public path to one of the 26 real TATTOO photos (from their media library). */
export function tattooSrc(n: number) {
  return `/images/tattoo/tattoo-${String(n).padStart(2, '0')}.jpg`;
}

export interface ArtistWork {
  src: string;
  ar: number; // width / height
}

// Compact builders for each artist's real work set (paths + aspect ratios).
const W = (slug: string, ars: number[]): ArtistWork[] =>
  ars.map((ar, i) => ({ src: `/images/work/${slug}-${String(i + 1).padStart(2, '0')}.jpg`, ar }));
const NW = (ars: number[]): ArtistWork[] =>
  ars.map((ar, i) => ({ src: `/images/tattoo/tattoo-${String(i + 1).padStart(2, '0')}.jpg`, ar }));

export interface Artist {
  slug: string;
  name: string;
  styles: string[];
  location: LocationId[];
  // Real studio portraits scraped from unicorntattoo.gr.
  portrait: string;
  bioEl: string;
  bioEn: string;
  // The artist's OWN works - exact photos from their gallery in the media library.
  work: ArtistWork[];
  instagram?: string;
}

export const ARTISTS: Artist[] = [
  {
    slug: 'nikos',
    name: 'Nikos',
    styles: ['Realism', 'Black & grey'],
    location: ['glyfada'],
    portrait: '/images/artists/nikos.jpg',
    bioEn:
      'Photoreal black & grey is where Nikos lives: portraits, animals and large-scale pieces built to last a lifetime.',
    bioEl:
      'Ο Νίκος ζει στο φωτορεαλιστικό μαύρο & γκρι: πορτρέτα, ζώα και μεγάλα κομμάτια φτιαγμένα να κρατούν μια ζωή.',
    work: NW([0.563, 0.563, 0.563, 0.562, 0.563, 0.563, 0.563, 0.563, 1, 1, 0.563, 0.563])
  },
  {
    slug: 'broker-diaz',
    name: 'Broker Diaz',
    styles: ['Lettering', 'Script', 'Graphic'],
    location: ['glyfada'],
    portrait: '/images/artists/broker.jpg',
    bioEn:
      "The studio's lettering specialist: hand-built script, custom blackletter and graphic work that reads as cleanly across the room as up close.",
    bioEl:
      'Ο ειδικός των γραμμάτων στο στούντιο: χειροποίητη καλλιγραφία, custom blackletter και graphic που διαβάζεται καθαρά από κοντά και από μακριά.',
    work: W('broker', [1.055, 1, 1, 1, 1, 1, 1, 0.814, 1, 1, 0.954, 1])
  },
  {
    slug: 'kostas',
    name: 'Kostas',
    styles: ['Colour', 'Graphic', 'Trash polka'],
    location: ['glyfada', 'corfu'],
    portrait: '/images/artists/kostas.jpg',
    bioEn:
      'Kostas pushes colour and graphic work: trash-polka, watercolour and pop-art pieces alongside detailed black & grey portraits.',
    bioEl:
      'Ο Κώστας σπρώχνει το χρώμα και το graphic: trash-polka, watercolour και pop-art, μαζί με λεπτομερή πορτρέτα σε μαύρο & γκρι.',
    work: W('kostas', [0.8, 0.857, 0.8, 0.8, 0.807, 1, 0.883, 0.881, 0.801, 0.854, 0.8, 1])
  },
  {
    slug: 'petros',
    name: 'Petros',
    styles: ['Geometric', 'Fine-line', 'Ornamental'],
    location: ['corfu'],
    portrait: '/images/artists/petros.jpg',
    bioEn:
      'At our Corfu studio, Petros works in geometry and fine-line: mandalas, ornamental linework and delicate designs, precise and personal.',
    bioEl:
      'Στο στούντιο της Κέρκυρας, ο Πέτρος δουλεύει γεωμετρία και fine-line: mandalas, διακοσμητική γραμμή και λεπτά σχέδια, ακριβή και προσωπικά.',
    work: W('petros', [1, 1, 1, 0.998, 1, 1, 1, 0.968, 1, 1, 1.001, 1.36])
  }
];

export function getArtist(slug: string) {
  return ARTISTS.find((a) => a.slug === slug);
}

/** Tattoo style pages (/portfolio/[style]) - piercing has its own page. */
export const TATTOO_STYLES = ['realistic', 'graphic', 'geometric', 'lettering'] as const;
export type TattooStyle = (typeof TATTOO_STYLES)[number];

/** Each style is defined by the artist whose real gallery is that style. */
export const STYLE_ARTIST: Record<TattooStyle, string> = {
  realistic: 'nikos',
  graphic: 'kostas',
  geometric: 'petros',
  lettering: 'broker-diaz'
};

export function getStyleWorks(style: TattooStyle) {
  const artist = getArtist(STYLE_ARTIST[style])!;
  return { artist, work: artist.work };
}

export interface GalleryItem {
  id: string;
  src: string;
  ar: number;
  artist: string;
}

/** Portfolio = every artist's real works, filterable by artist. Piercing is separate. */
export const GALLERY: GalleryItem[] = ARTISTS.flatMap((a) =>
  a.work.map((w, i) => ({ id: `${a.slug}-${i}`, src: w.src, ar: w.ar, artist: a.slug }))
);

/** Portfolio filters - by artist (each shows that artist's exact works). */
export const ARTIST_FILTERS = ARTISTS.map((a) => ({ id: a.slug, name: a.name }));

/** Distinct background photos per section (scraped studio assets). */
export const BACKGROUNDS = {
  hero: '/images/bg/hero.jpg',
  cta: '/images/bg/cta.jpg',
  banner: '/images/bg/banner.jpg'
} as const;

/**
 * Featured work strip on the home page.
 * TODO: client asset - replace placeholder paths with licensed studio photos.
 */
export interface WorkItem {
  id: string;
  style: SpecialtyId;
  src: string;
  alt: string;
  altEl: string;
  span?: 'tall' | 'wide';
}

export const FEATURED_WORK: WorkItem[] = [
  { id: 'w1', style: 'realistic', src: '/images/tattoo/tattoo-05.jpg', alt: 'Realistic lion tattoo by Nikos', altEl: 'Ρεαλιστικό λιοντάρι · Νίκος' },
  { id: 'w2', style: 'lettering', src: '/images/work/broker-04.jpg', alt: 'Script lettering by Broker Diaz', altEl: 'Καλλιγραφία · Broker Diaz' },
  { id: 'w3', style: 'graphic', src: '/images/work/kostas-08.jpg', alt: 'Colour graphic tattoo by Kostas', altEl: 'Έγχρωμο graphic · Κώστας' },
  { id: 'w4', style: 'geometric', src: '/images/work/petros-10.jpg', alt: 'Geometric mandala by Petros', altEl: 'Γεωμετρικό mandala · Πέτρος' },
  { id: 'w5', style: 'realistic', src: '/images/work/kostas-05.jpg', alt: 'Black & grey portrait by Kostas', altEl: 'Πορτρέτο μαύρο & γκρι · Κώστας' }
];

/** Static fallback grid for the Instagram section (real tattoo work, mixed styles). */
// 9 posts on purpose: the bento grid is 1 feature (2x2) + 8 singles = 12 cells,
// which fills EXACTLY 3 rows of 4 on desktop and 6 rows of 2 on mobile - no
// orphaned tiles on the last row.
export const INSTAGRAM_FALLBACK = [
  '/images/tattoo/tattoo-01.jpg',
  '/images/work/kostas-04.jpg',
  '/images/work/petros-11.jpg',
  '/images/work/broker-07.jpg',
  '/images/work/kostas-08.jpg',
  '/images/tattoo/tattoo-07.jpg',
  '/images/work/petros-05.jpg',
  '/images/work/broker-03.jpg',
  '/images/work/kostas-11.jpg'
].map((src, i) => ({ id: `ig-${i + 1}`, src, href: SITE.social.instagram }));
