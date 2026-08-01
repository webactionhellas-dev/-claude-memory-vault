// SERVER ONLY — editable site copy from Supabase `site_content`, cached in
// memory. Call loadContent() at the top of a server-rendered page, then read
// strings with c(key, defaultEl, defaultEn). Falls back to the hard-coded
// default whenever a key is missing or the DB is unavailable, so the site is
// always safe even before a row is edited.
import { supabaseAdmin, adminReady } from './supabase-admin';

export interface ContentValue {
  el: string;
  en: string;
}

let cache = new Map<string, ContentValue>();
let lastLoad = 0;
let inflight: Promise<void> | null = null;
const TTL = 3000; // ms — edits show within a few seconds

export async function loadContent(force = false): Promise<void> {
  if (!adminReady()) return;
  const now = Date.now();
  if (!force && now - lastLoad < TTL) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabaseAdmin.from('site_content').select('key,el,en');
      if (!error && data) {
        const next = new Map<string, ContentValue>();
        for (const r of data as any[]) next.set(r.key, { el: r.el ?? '', en: r.en ?? '' });
        cache = next;
      }
    } catch {
      /* keep the previous cache on any error */
    } finally {
      lastLoad = Date.now();
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Editable copy for a key, falling back to the provided default. */
export function c(key: string, el: string, en: string): ContentValue {
  const v = cache.get(key);
  return { el: v?.el || el, en: v?.en || en };
}

/** Force the next loadContent() to refetch (call after an admin write). */
export function invalidateContent(): void {
  lastLoad = 0;
}
