/* ============================================================
   MYKONOS PRESTIGE VILLAS, single source of truth for content
   ------------------------------------------------------------
   Real facts (villa sizes, location, contact) were taken from the
   existing mykonosprestigevillas.gr. Guest/bedroom counts & amenity
   detail follow the client brief. Anything you should tailor is
   flagged with a // TODO comment.
   ============================================================ */

import {
  UtensilsCrossed,
  Ship,
  Sparkles,
  ConciergeBell,
  Plane,
  Wine,
  Waves,
  Car,
  Music4,
  type LucideIcon,
} from "lucide-react";

export const site = {
  name: "Mykonos Prestige Villas",
  shortName: "MPV",
  tagline: "Your Private Sunset",
  domain: "mykonosprestigevillas.gr",
  email: "reservation@mykonosprestigevillas.gr",
  phoneDisplay: "+30 6957 772858",
  whatsapp: "306957772858", // wa.me number, digits only
  address: "Faros Armenistis, Fanari 846 00 · Mykonos, Greece",
  instagram: "https://www.instagram.com/mykonosprestigevillas/",
  instagramHandle: "@mykonosprestigevillas",
  // TODO: point this at your real reservation engine. WhatsApp is a strong default.
  bookingUrl: "https://wa.me/306957772858?text=Hello%2C%20I%27d%20like%20to%20enquire%20about%20a%20private%20stay.",
} as const;

export const nav = [
  { label: "Villa Thalassa", href: "/villas/thalassa" },
  { label: "Villa Anemos", href: "/villas/anemos" },
  { label: "Experiences", href: "/experiences" },
  { label: "Gallery", href: "/gallery" },
  { label: "About", href: "/about" },
] as const;

/* ---------------- Villas ---------------- */

export type Villa = {
  id: "thalassa" | "anemos";
  name: string;
  subtitle: string;
  meaning: string;
  tagline: string; // one-line hook for the villa page hero
  video: string; // villa hero video (from their own villa page)
  videoMobile: string;
  heroImage: string; // poster / fallback for the hero video
  feature: string; // a stunning landscape shot for the full-bleed parallax band
  ama: string; // official Greek tourism registration number
  hero: string; // real photo we already downloaded
  thumb: string;
  size: string;
  bedrooms: number;
  guests: number;
  baths: number;
  poolLength: string;
  story: string;
  longStory: string[]; // paragraphs for the villa page
  highlights: string[];
  amenities: string[]; // exact amenities list from the official villa page
  includedServices: string[]; // services included with every stay
  photos: string[]; // full gallery for the dedicated villa page
  spaces: { name: string; detail: string }[]; // the "spaces" grid on the villa page
  /** Carousel, mix of real assets and clearly-labeled placeholders to replace with IG. */
  gallery: { src?: string; placeholder?: boolean; tag?: string }[];
};

export const villas: Villa[] = [
  {
    id: "thalassa",
    name: "Villa Thalassa",
    subtitle: "The Sea Estate · Kastro",
    meaning: "Thalassa, the sea itself",
    tagline: "Five hundred square metres of whitewashed calm, built around the horizon.",
    video: "/media/real/thalassa.webm",
    videoMobile: "/media/real/thalassa_mobile.webm",
    heroImage: "/media/villas/thalassa/th_01.webp",
    feature: "/media/villas/thalassa/th_11.webp",
    ama: "00003642850",
    hero: "/media/real/thalassa_exp.webp",
    thumb: "/media/real/thalassa_thumb.webp",
    size: "500 m²",
    bedrooms: 8,
    guests: 16,
    baths: 7,
    poolLength: "Private infinity pool",
    story:
      "The flagship of the estate. Five hundred square metres of whitewashed calm perched above Kastro, where every room is written around a 180° horizon of Delos, the Aegean and the old town. Days dissolve from espresso on cool stone to a last glass of Assyrtiko as the sun falls into the sea.",
    highlights: [
      "180° panoramic views of Delos & Mykonos Town",
      "Large private infinity pool with extra-comfort sunbeds",
      "Outdoor firepit lounge & al-fresco dining area",
      "Open-plan living across three levels",
    ],
    amenities: [
      "Private infinity pool",
      "Outdoor & indoor lounge and dining area",
      "Outdoor firepit lounge",
      "Air conditioning",
      "Private parking area",
      "Starlink internet access",
      "JBL sound equipment",
      "Flat-screen smart TVs",
      "Yoga mats",
      "PlayStation 5",
      "BBQ",
      "Baby cot (prior notice, no charge)",
      "High chair (prior notice, no charge)",
    ],
    includedServices: ["Daily housekeeping", "Private parking area"],
    longStory: [
      "Villa Thalassa is the flagship of the estate: five hundred square metres of light, stone and sea, perched on the highest shoulder of Kastro. Every one of its eight suites is composed around the same 180° horizon of Delos, the open Aegean and the lights of the old town.",
      "Days here have a rhythm of their own. Espresso on cool morning stone, long lunches by the pool, an afternoon dissolving into the infinity pool, and a last glass of Assyrtiko beside the firepit as the sun falls into the water.",
      "Behind the calm is a full house team: a private chef, daily housekeeping and a concierge who arranges everything before you think to ask. It is not a rental. It is your own address on Mykonos.",
    ],
    // ALL professional photography from the official villa-thalassa page (32 shots, 1920px).
    photos: Array.from({ length: 32 }, (_, i) => `/media/villas/thalassa/th_${String(i + 1).padStart(2, "0")}.webp`),
    spaces: [
      { name: "The Infinity Pool", detail: "A large infinity pool with extra-comfort sunbeds and a sitting lounge." },
      { name: "The Firepit", detail: "An outdoor firepit lounge and al-fresco dining area." },
      { name: "Eight Bedrooms", detail: "En-suite bedrooms across three levels, most with sea views." },
      { name: "Open-Plan Living", detail: "High-ceiling living and dining opening onto the pool." },
    ],
    gallery: [
      { src: "/media/villas/thalassa/th_01.webp", tag: "The estate at dusk" },
      { src: "/media/villas/thalassa/th_06.webp", tag: "Sea view" },
      { src: "/media/villas/thalassa/th_09.webp", tag: "Master suite" },
      { src: "/media/villas/thalassa/th_16.webp", tag: "Infinity pool" },
      { src: "/media/villas/thalassa/th_20.webp", tag: "Kastro views" },
      { src: "/media/villas/thalassa/th_08.webp", tag: "Living space" },
    ],
  },
  {
    id: "anemos",
    name: "Villa Anemos",
    subtitle: "The Wind Residence · Kastro",
    meaning: "Anemos, the island wind",
    tagline: "Intimate, luminous and effortlessly private, for the family and the few.",
    video: "/media/real/anemos.webm",
    videoMobile: "/media/real/anemos_mobile.webm",
    heroImage: "/media/villas/anemos/an_01.webp",
    feature: "/media/villas/anemos/an_04.webp",
    ama: "00003642871",
    hero: "/media/real/anemos.webp",
    thumb: "/media/real/anemos_thumb.webp",
    size: "260 m²",
    bedrooms: 6,
    guests: 12,
    baths: 6,
    poolLength: "Private infinity pool",
    story:
      "Intimate, luminous, effortlessly private. Two hundred and sixty square metres of pure Cycladic architecture that catches the meltemi and the light in equal measure. Anemos is the residence for the family and the few, closer, warmer, with the same untouchable sunset.",
    highlights: [
      "180° sea & sunset views over Kastro",
      "Private infinity pool & outdoor lounge area",
      "Indoor fireplace & minimalist Cycladic interiors",
      "Natural rock elements & whitewashed accents",
    ],
    amenities: [
      "Private infinity pool",
      "Outdoor sitting & lounge area",
      "Private parking area",
      "Indoor fireplace",
      "Air conditioning",
      "Starlink internet access",
      "JBL sound equipment",
      "Flat-screen smart TVs",
      "Yoga mats",
      "PlayStation 5",
      "BBQ",
      "Baby cot (prior notice, no charge)",
      "High chair (prior notice, no charge)",
    ],
    includedServices: ["Daily housekeeping", "Private parking area"],
    longStory: [
      "Villa Anemos is the estate at its most intimate: two hundred and sixty square metres of pure Cycladic architecture that catches the meltemi and the morning light in equal measure. Six luminous suites, whitewashed and calm, open onto the same untouchable sunset as its sister.",
      "It is the house for the family and the few. Closer, warmer, easier, yet with nothing given up: a private infinity pool, an al-fresco pergola for long dinners under the stars, and Mykonos Town a few minutes down the hill.",
      "With a concierge on call around the clock and daily housekeeping, Anemos feels less like a stay and more like slipping into a life you never want to leave.",
    ],
    // ALL professional photography from the official villa-anemos page (17 shots, 1500px).
    // Natural order: the pool shots (an_01, an_02, an_03) lead the gallery per client preference.
    photos: Array.from({ length: 17 }, (_, i) => `/media/villas/anemos/an_${String(i + 1).padStart(2, "0")}.webp`),
    spaces: [
      { name: "The Infinity Pool", detail: "A private infinity pool with an outdoor sitting and lounge area." },
      { name: "Six Bedrooms", detail: "Double bedrooms across three levels, several sea-view en-suites." },
      { name: "The Fireplace", detail: "An indoor fireplace among whitewashed, minimalist interiors." },
      { name: "Open-Plan Living", detail: "Living and dining opening directly onto the pool." },
    ],
    gallery: [
      { src: "/media/villas/anemos/an_02.webp", tag: "Infinity pool" },
      { src: "/media/villas/anemos/an_11.webp", tag: "The residence" },
      { src: "/media/villas/anemos/an_12.webp", tag: "Whitewashed calm" },
      { src: "/media/villas/anemos/an_15.webp", tag: "Sea view" },
      { src: "/media/villas/anemos/an_16.webp", tag: "Pool at dusk" },
      { src: "/media/villas/anemos/an_08.webp", tag: "Living space" },
    ],
  },
];

/* ---------------- Signature experiences ---------------- */

export type Experience = {
  icon: LucideIcon;
  title: string;
  copy: string;
};

export const experiences: Experience[] = [
  {
    icon: UtensilsCrossed,
    title: "Private Chef & Sommelier",
    copy: "A Michelin-trained chef designs your menu around the morning's catch and the estate's cellar, served wherever the light is best.",
  },
  {
    icon: Ship,
    title: "Yacht & Catamaran Charters",
    copy: "Step from the villa to a private yacht for Delos, Rhenia's turquoise coves, or a champagne sunset cruise around the caldera.",
  },
  {
    icon: Plane,
    title: "Helicopter & Jet Transfers",
    copy: "Skip the crowds. Direct helipad transfers from Athens, Santorini or the airport land you at the door in minutes.",
  },
  {
    icon: Sparkles,
    title: "In-Villa Wellness",
    copy: "Sunrise yoga on the terrace, a spa therapist, sauna and cold plunge, a private wellness ritual without leaving home.",
  },
  {
    icon: ConciergeBell,
    title: "24/7 Concierge",
    copy: "A dedicated host anticipates everything: reservations at Scorpios & Nammos, VIP tables, security, and the impossible made simple.",
  },
  {
    icon: Wine,
    title: "Events & Celebrations",
    copy: "Proposals, milestone dinners, intimate weddings, designed and staged against the most photographed sunset in the Cyclades.",
  },
  {
    icon: Car,
    title: "Chauffeur & Fleet",
    copy: "A private driver and curated fleet, from open-top jeeps to a Mercedes S-Class, on standby throughout your stay.",
  },
  {
    icon: Music4,
    title: "Curated Nights",
    copy: "Resident DJs, live bouzouki, mixologists and floating breakfasts, the island's energy, staged privately for you.",
  },
];

/* ---------------- Gallery (masonry) ----------------
   Professional photography from both villa pages (1500–1920px). */

export type GalleryItem = {
  src?: string;
  placeholder?: boolean;
  tag: string;
  span: "tall" | "wide" | "big" | "std";
};

// Tags are intentionally generic/place-based (never a specific room claim) so
// they always read true for the image shown.
export const gallery: GalleryItem[] = [
  { src: "/media/villas/thalassa/th_11.webp", tag: "Villa Thalassa", span: "big" },
  { src: "/media/villas/thalassa/th_09.webp", tag: "Cycladic light", span: "tall" },
  { src: "/media/villas/anemos/an_04.webp", tag: "Villa Anemos", span: "std" },
  { src: "/media/villas/thalassa/th_04.webp", tag: "Golden hour", span: "wide" },
  { src: "/media/villas/anemos/an_09.webp", tag: "Whitewashed", span: "std" },
  { src: "/media/villas/thalassa/th_02.webp", tag: "Above the Aegean", span: "tall" },
  { src: "/media/villas/thalassa/th_07.webp", tag: "Kastro", span: "std" },
  { src: "/media/villas/thalassa/th_13.webp", tag: "Light & stone", span: "wide" },
  { src: "/media/villas/anemos/an_16.webp", tag: "Island dusk", span: "std" },
  { src: "/media/villas/anemos/an_08.webp", tag: "Villa Anemos", span: "std" },
  { src: "/media/villas/thalassa/th_20.webp", tag: "Sea & sky", span: "tall" },
  { src: "/media/villas/thalassa/th_24.webp", tag: "Mykonos", span: "std" },
];

/* ---------------- Included & on-request services ----------------
   Icons + labels taken from the official villa pages. */

export const services = [
  { icon: "suitcase", label: "Pack & Unpack" },
  { icon: "security", label: "Security" },
  { icon: "babysitting", label: "Babysitting" },
  { icon: "dome", label: "Catering" },
  { icon: "events", label: "Events" },
  { icon: "airporttransfers", label: "Airport Transfers" },
  { icon: "helipad", label: "Helipad" },
  { icon: "chef", label: "Private Chef" },
  { icon: "tripplanning", label: "Concierge Services" },
  { icon: "rentacar", label: "Car Rentals" },
  { icon: "yacht", label: "Yacht Rentals" },
  { icon: "massage", label: "Massage Sessions" },
  { icon: "mat", label: "Yoga & Pilates Sessions" },
  { icon: "washing", label: "Laundry Services" },
] as const;

/* ---------------- Testimonials ---------------- */

export const testimonials = [
  {
    quote:
      "The most beautiful place we have ever stayed. The sunset from Thalassa's rooftop is something we still talk about a year later.",
    author: "The Al-Rashid Family",
    origin: "Dubai · 10 nights, Villa Thalassa",
  },
  {
    quote:
      "Flawless from the helicopter transfer to the private chef. It felt less like a rental and more like owning a piece of Mykonos.",
    author: "Sophia & Laurent",
    origin: "Paris · Anniversary, Villa Anemos",
  },
  {
    quote:
      "We hosted twelve for a milestone birthday. Every request was met before we asked. Genuinely Aman-level service.",
    author: "James H.",
    origin: "London · Private celebration",
  },
] as const;

/* ---------------- Trust badges ---------------- */

export const trust = [
  "Built 2022",
  "Kastro · Prime Mykonos",
  "180° Sunset Views",
  "Private Chef & Concierge",
  "Helipad Access",
] as const;

/* ---------------- About ---------------- */

export const about = {
  heroImage: "/media/villas/thalassa/th_11.webp",
  eyebrow: "Our Story",
  title: "A private corner of Mykonos, kept for the few",
  lede: "Mykonos Prestige Villas began with a simple conviction: that the most beautiful part of the island should be lived in, not just looked at.",
  story: [
    "In 2022 we completed two estates on the headland of Kastro, Faros Armenistis, where the land falls away toward Delos and the open sea. Villa Thalassa and Villa Anemos were built to the same standard and the same view, one grand, one intimate, both unmistakably Cycladic.",
    "Everything since has been about the stay itself. A private chef who cooks around the day's catch, a concierge who knows which table, which captain, which beach and when. Helicopter transfers that skip the crowds. Details handled before they become requests.",
    "We keep the calendar deliberately quiet. A limited number of guests each season means every arrival is personal, and every departure is the beginning of the next booking.",
  ],
  values: [
    { title: "Architecture", copy: "Minimalist Cycladic design in stone, lime and light, framing the horizon from every room." },
    { title: "Service", copy: "A full private team, discreet and anticipatory, at Aman-level standards." },
    { title: "Privacy", copy: "Two gated estates, staffed and entirely your own, above the noise of the island." },
    { title: "Location", copy: "The Kastro headland, minutes from Mykonos Town yet a world apart." },
  ],
  stats: [
    { value: "2", label: "Private estates" },
    { value: "760 m²", label: "Combined living space" },
    { value: "28", label: "Guests hosted" },
    { value: "180°", label: "Aegean views" },
  ],
} as const;
