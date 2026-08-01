import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Client-side image intake for the CMS: validate, downscale to web size,
 * re-encode as JPEG, upload to the public "site" bucket, return the public
 * URL plus the aspect ratio (the gallery layout needs it).
 */

const MAX_DIM = 1600;
const JPEG_QUALITY = 0.85;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadedImage {
  url: string;
  ar: number; // width / height
}

async function compress(file: File): Promise<{ blob: Blob; ar: number }> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error('Μη αποδεκτός τύπος αρχείου. Επιτρέπονται JPG, PNG και WebP.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Το αρχείο ξεπερνά τα 15MB. Διάλεξε μικρότερη φωτογραφία.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();

    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Ο browser δεν υποστηρίζει επεξεργασία εικόνας.');
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    if (!blob) throw new Error('Η συμπίεση της εικόνας απέτυχε.');

    return { blob, ar: Number((width / height).toFixed(3)) };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function safeName(original: string): string {
  const base = original
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'photo';
}

export async function uploadImage(
  supabase: SupabaseClient,
  folder: 'work' | 'artists' | 'bg' | 'featured' | 'instagram' | 'piercing',
  file: File
): Promise<UploadedImage> {
  const { blob, ar } = await compress(file);
  const path = `${folder}/${Date.now()}-${safeName(file.name)}.jpg`;

  const { error } = await supabase.storage.from('site').upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false
  });
  if (error) {
    throw new Error(`Το ανέβασμα απέτυχε: ${error.message}`);
  }

  const { data } = supabase.storage.from('site').getPublicUrl(path);
  return { url: data.publicUrl, ar };
}
