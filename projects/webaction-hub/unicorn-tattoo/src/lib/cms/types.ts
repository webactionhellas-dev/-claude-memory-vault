/**
 * Row shapes of the Supabase CMS tables (project: unicorn-tattoo).
 * These mirror supabase/migrations - keep both in sync.
 */

export interface SiteContentRow {
  key: string;
  locale: 'el' | 'en';
  value: string;
}

export interface ArtistRow {
  slug: string;
  name: string;
  styles: string[];
  locations: string[];
  portrait: string;
  bio_el: string;
  bio_en: string;
  instagram: string | null;
  sort: number;
  visible: boolean;
}

export interface PortfolioItemRow {
  id: string;
  artist_slug: string;
  src: string;
  ar: number;
  sort: number;
  visible: boolean;
}

export interface StudioRow {
  id: string;
  city: string;
  city_el: string;
  street: string;
  street_el: string;
  postal_code: string;
  region: string;
  note: string | null;
  note_el: string | null;
  phone: string;
  email: string;
  lat: number;
  lng: number;
  place_ftid: string;
  place_name: string;
  maps_url: string;
  sort: number;
  visible: boolean;
}

export interface FeaturedWorkRow {
  id: string;
  style: string;
  src: string;
  alt_en: string;
  alt_el: string;
  sort: number;
  visible: boolean;
}

export interface InstagramPostRow {
  id: string;
  src: string;
  href: string;
  sort: number;
  visible: boolean;
}

export interface PiercingPhotoRow {
  id: string;
  src: string;
  sort: number;
  visible: boolean;
}

export interface SiteSettingRow {
  key: string;
  value: string;
}
