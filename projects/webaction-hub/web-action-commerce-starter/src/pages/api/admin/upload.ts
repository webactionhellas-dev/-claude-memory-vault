import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { requireAdmin } from '@/lib/admin-guard';
import { supabaseAdmin, adminReady } from '@/lib/supabase-admin';
import { ADMIN_EDITABLE } from '@/lib/store-config';

export const prerender = false;

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 60) || 'product';

// Accepts multipart form-data (field "files", optional "slug"); normalizes each
// image to a ≤1400px WebP and uploads to the product-images bucket. Returns the
// public URLs to store in the product's images array.
export const POST: APIRoute = async ({ request, cookies }) => {
  const g = await requireAdmin(cookies, request);
  if (!g.ok) return json({ error: g.error }, g.status);
  if (!adminReady()) return json({ error: 'Server not configured.' }, 503);
  if (!ADMIN_EDITABLE) return json({ error: 'Product editing is disabled for this store.' }, 409);

  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: 'Expected form-data.' }, 400);
  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return json({ error: 'No files.' }, 400);
  const slug = slugify(String(form.get('slug') || 'product'));

  const urls: string[] = [];
  for (const file of files) {
    try {
      const input = Buffer.from(await file.arrayBuffer());
      const webp = await sharp(input)
        .rotate()
        .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      const path = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      const { error } = await supabaseAdmin.storage
        .from('product-images')
        .upload(path, webp, { contentType: 'image/webp', upsert: false });
      if (error) return json({ error: error.message }, 500);
      const { data } = supabaseAdmin.storage.from('product-images').getPublicUrl(path);
      urls.push(data.publicUrl);
    } catch (e: any) {
      return json({ error: `Could not process ${file.name}: ${e.message}` }, 400);
    }
  }
  return json({ urls });
};
