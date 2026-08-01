/**
 * Single source of truth for business contact details.
 * Update these once and they propagate across the whole site,
 * the WhatsApp button, JSON-LD schema and the booking form.
 */
export const site = {
  name: "Green Cleaners",
  legalName: "GREEN CLEANERS – Καθαριστήρια Πράσινης Τεχνολογίας",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://greencleaners.gr",
  email: "greencleanershellas@gmail.com",
  /** Central booking / WhatsApp line. */
  bookingPhone: "6988380756",
  whatsapp: "6988380756",
  // Greater Athens / East Attica
  geo: { lat: 37.9676, lng: 23.8517 },
  social: {
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
  },
} as const;
