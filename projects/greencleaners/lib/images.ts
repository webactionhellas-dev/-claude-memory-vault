/**
 * Imagery used across the site.
 *
 * ▶ Hero + About now use REAL photos of the business, downloaded from the
 *   client's site into /public/photos (their Pangrati storefront & window).
 *   Swap these for newer/higher-res shots any time by replacing the files.
 *
 * ▶ The remaining few are tasteful Unsplash placeholders; replace with real
 *   client photography (drop files in /public/photos and point the paths here).
 *   The <Photo> component degrades to a branded gradient if a URL is missing.
 */
const u = (id: string, w = 1400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const images = {
  // REAL — Green Cleaners Pangrati storefront (hero)
  garments: "/photos/pangrati-storefront.jpg",
  // REAL — Green Cleaners branded window / interior (about page)
  about: "/photos/pangrati-interior.jpg",
  // Placeholder — fresh laundry (eco section); replace with a real photo
  eco: u("photo-1545173168-9f1947eebb7f"),
  // Placeholder — folded textiles (spare)
  textiles: u("photo-1582735689369-4fe89db7114c"),
};
