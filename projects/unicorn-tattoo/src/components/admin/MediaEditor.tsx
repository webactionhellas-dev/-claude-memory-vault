'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeaturedWorkRow, InstagramPostRow, PiercingPhotoRow } from '@/lib/cms/types';
import { uploadImage } from './upload';
import { btn, btnGhost, card, field, label, sectionTitle } from './ui';

/**
 * Home and section imagery: featured-work strip, Instagram fallback grid,
 * piercing gallery and page backgrounds (site_settings keys).
 */

const STYLE_OPTIONS = [
  { id: 'realistic', title: 'Ρεαλιστικό' },
  { id: 'graphic', title: 'Γραφικό' },
  { id: 'geometric', title: 'Γεωμετρικό' },
  { id: 'lettering', title: 'Γράμματα' },
  { id: 'piercing', title: 'Piercing' }
];

const BACKGROUND_KEYS = [
  { key: 'background.hero', title: 'Φόντο αρχικής / Σχετικά' },
  { key: 'background.cta', title: 'Φόντο πρόσκλησης κράτησης' },
  { key: 'background.banner', title: 'Φόντο banner' },
  { key: 'background.footer', title: 'Φόντο υποσέλιδου' },
  { key: 'piercing.introImage', title: 'Εικόνα εισαγωγής piercing' }
];

export default function MediaEditor({
  supabase,
  onSaved,
  onError
}: {
  supabase: SupabaseClient;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [featured, setFeatured] = useState<FeaturedWorkRow[] | null>(null);
  const [instagram, setInstagram] = useState<InstagramPostRow[] | null>(null);
  const [piercing, setPiercing] = useState<PiercingPhotoRow[] | null>(null);
  const [settings, setSettings] = useState<Map<string, string> | null>(null);
  const [removed, setRemoved] = useState<{ table: string; id: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [f, g, p, s] = await Promise.all([
        supabase.from('featured_work').select('*').order('sort'),
        supabase.from('instagram_posts').select('*').order('sort'),
        supabase.from('piercing_photos').select('*').order('sort'),
        supabase.from('site_settings').select('key,value')
      ]);
      if (cancelled) return;
      if (f.error || g.error || p.error || s.error) {
        onError('Αποτυχία φόρτωσης εικόνων από τη βάση.');
        return;
      }
      setFeatured((f.data ?? []) as FeaturedWorkRow[]);
      setInstagram((g.data ?? []) as InstagramPostRow[]);
      setPiercing((p.data ?? []) as PiercingPhotoRow[]);
      setSettings(new Map((s.data ?? []).map((row) => [row.key as string, row.value as string])));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, onError]);

  const move = <T,>(list: T[], idx: number, dir: -1 | 1): T[] => {
    const target = idx + dir;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[idx], next[target]] = [next[target], next[idx]];
    return next;
  };

  const upload = async (folder: 'featured' | 'instagram' | 'piercing' | 'bg', file: File) => {
    const { url, ar } = await uploadImage(supabase, folder, file);
    return { url, ar };
  };

  const save = async () => {
    if (!featured || !instagram || !piercing || !settings) return;
    setBusy(true);
    try {
      for (const del of removed) {
        const { error } = await supabase.from(del.table).delete().eq('id', del.id);
        if (error) throw error;
      }
      // Explicit column sets: mixed keys in one upsert make PostgREST write
      // NULL (not DEFAULT) into the absent columns, e.g. updated_at.
      if (featured.length > 0) {
        const { error } = await supabase.from('featured_work').upsert(
          featured.map((row, i) => ({
            id: row.id,
            style: row.style,
            src: row.src,
            alt_en: row.alt_en,
            alt_el: row.alt_el,
            sort: i,
            visible: row.visible
          }))
        );
        if (error) throw error;
      }
      if (instagram.length > 0) {
        const { error } = await supabase.from('instagram_posts').upsert(
          instagram.map((row, i) => ({
            id: row.id,
            src: row.src,
            href: row.href,
            sort: i,
            visible: row.visible
          }))
        );
        if (error) throw error;
      }
      if (piercing.length > 0) {
        const { error } = await supabase.from('piercing_photos').upsert(
          piercing.map((row, i) => ({
            id: row.id,
            src: row.src,
            sort: i,
            visible: row.visible
          }))
        );
        if (error) throw error;
      }
      const settingRows = [...settings.entries()].map(([key, value]) => ({ key, value }));
      if (settingRows.length > 0) {
        const { error } = await supabase.from('site_settings').upsert(settingRows);
        if (error) throw error;
      }
      setRemoved([]);
      onSaved();
    } catch {
      onError('Η αποθήκευση απέτυχε. Δοκίμασε ξανά.');
    } finally {
      setBusy(false);
    }
  };

  if (!featured || !instagram || !piercing || !settings) {
    return <p className="text-sm text-bone-dim">Φόρτωση εικόνων...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Featured work strip */}
      <section className={card}>
        <h2 className={sectionTitle}>Επιλεγμένα έργα (αρχική σελίδα)</h2>
        <div className="space-y-4">
          {featured.map((item, i) => (
            <div key={item.id} className="grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-[96px_1fr_auto]">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt="" className="aspect-[3/4] w-24 rounded-lg object-cover" />
                <label className="mt-2 block cursor-pointer text-[11px] uppercase tracking-kicker text-bone-faint hover:text-violet">
                  Αλλαγή
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      try {
                        const { url } = await upload('featured', file);
                        setFeatured((prev) =>
                          prev ? prev.map((r) => (r.id === item.id ? { ...r, src: url } : r)) : prev
                        );
                      } catch (err) {
                        onError(err instanceof Error ? err.message : 'Το ανέβασμα απέτυχε.');
                      }
                    }}
                  />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className={label}>Περιγραφή (Ελληνικά)</label>
                  <input
                    className={field}
                    value={item.alt_el}
                    onChange={(e) =>
                      setFeatured((prev) =>
                        prev ? prev.map((r) => (r.id === item.id ? { ...r, alt_el: e.target.value } : r)) : prev
                      )
                    }
                  />
                </div>
                <div>
                  <label className={label}>Περιγραφή (Αγγλικά)</label>
                  <input
                    className={field}
                    value={item.alt_en}
                    onChange={(e) =>
                      setFeatured((prev) =>
                        prev ? prev.map((r) => (r.id === item.id ? { ...r, alt_en: e.target.value } : r)) : prev
                      )
                    }
                  />
                </div>
                <div>
                  <label className={label}>Στυλ</label>
                  <select
                    className={field}
                    value={item.style}
                    onChange={(e) =>
                      setFeatured((prev) =>
                        prev ? prev.map((r) => (r.id === item.id ? { ...r, style: e.target.value } : r)) : prev
                      )
                    }
                  >
                    {STYLE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-start gap-1 text-bone-faint">
                <button className="px-2 py-1 hover:text-bone disabled:opacity-30" disabled={i === 0}
                  onClick={() => setFeatured((prev) => (prev ? move(prev, i, -1) : prev))} aria-label="Πάνω">↑</button>
                <button className="px-2 py-1 hover:text-bone disabled:opacity-30" disabled={i === featured.length - 1}
                  onClick={() => setFeatured((prev) => (prev ? move(prev, i, 1) : prev))} aria-label="Κάτω">↓</button>
                <button className="px-2 py-1 hover:text-red-300" aria-label="Διαγραφή"
                  onClick={() => {
                    setFeatured((prev) => (prev ? prev.filter((r) => r.id !== item.id) : prev));
                    setRemoved((prev) => [...prev, { table: 'featured_work', id: item.id }]);
                  }}>✕</button>
              </div>
            </div>
          ))}
        </div>
        <label className={`${btnGhost} mt-4 cursor-pointer`}>
          + Προσθήκη έργου
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                const { url } = await upload('featured', file);
                setFeatured((prev) =>
                  prev
                    ? [...prev, { id: crypto.randomUUID(), style: 'realistic', src: url, alt_en: '', alt_el: '', sort: prev.length, visible: true }]
                    : prev
                );
              } catch (err) {
                onError(err instanceof Error ? err.message : 'Το ανέβασμα απέτυχε.');
              }
            }}
          />
        </label>
      </section>

      {/* Instagram fallback grid */}
      <section className={card}>
        <h2 className={sectionTitle}>Πλέγμα Instagram (εναλλακτικές φωτογραφίες)</h2>
        <p className="mb-4 text-[12px] leading-relaxed text-bone-faint">
          Εμφανίζονται όταν δεν υπάρχει ζωντανή σύνδεση με το Instagram. Ιδανικό πλήθος: 9.
        </p>
        <PhotoGrid
          items={instagram.map((r) => ({ id: r.id, src: r.src }))}
          onMove={(i, dir) => setInstagram((prev) => (prev ? move(prev, i, dir) : prev))}
          onRemove={(id) => {
            setInstagram((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
            setRemoved((prev) => [...prev, { table: 'instagram_posts', id }]);
          }}
        />
        <label className={`${btnGhost} mt-4 cursor-pointer`}>
          + Προσθήκη φωτογραφιών
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = '';
              try {
                for (const file of files) {
                  const { url } = await upload('instagram', file);
                  setInstagram((prev) =>
                    prev
                      ? [...prev, { id: crypto.randomUUID(), src: url, href: 'https://www.instagram.com/unicorn.tattoo/', sort: prev.length, visible: true }]
                      : prev
                  );
                }
              } catch (err) {
                onError(err instanceof Error ? err.message : 'Το ανέβασμα απέτυχε.');
              }
            }}
          />
        </label>
      </section>

      {/* Piercing gallery */}
      <section className={card}>
        <h2 className={sectionTitle}>Γκαλερί piercing</h2>
        <PhotoGrid
          items={piercing.map((r) => ({ id: r.id, src: r.src }))}
          onMove={(i, dir) => setPiercing((prev) => (prev ? move(prev, i, dir) : prev))}
          onRemove={(id) => {
            setPiercing((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
            setRemoved((prev) => [...prev, { table: 'piercing_photos', id }]);
          }}
        />
        <label className={`${btnGhost} mt-4 cursor-pointer`}>
          + Προσθήκη φωτογραφιών
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = '';
              try {
                for (const file of files) {
                  const { url } = await upload('piercing', file);
                  setPiercing((prev) =>
                    prev
                      ? [...prev, { id: crypto.randomUUID(), src: url, sort: prev.length, visible: true }]
                      : prev
                  );
                }
              } catch (err) {
                onError(err instanceof Error ? err.message : 'Το ανέβασμα απέτυχε.');
              }
            }}
          />
        </label>
      </section>

      {/* Backgrounds / single-image settings */}
      <section className={card}>
        <h2 className={sectionTitle}>Φόντα σελίδων</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BACKGROUND_KEYS.map(({ key, title }) => {
            const src = settings.get(key) ?? '';
            return (
              <div key={key}>
                <span className={label}>{title}</span>
                <div className="aspect-video overflow-hidden rounded-lg bg-ink-700">
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <label className="mt-2 block cursor-pointer text-[11px] uppercase tracking-kicker text-bone-faint hover:text-violet">
                  Αλλαγή
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      try {
                        const { url } = await upload('bg', file);
                        setSettings((prev) => {
                          const next = new Map(prev);
                          next.set(key, url);
                          return next;
                        });
                      } catch (err) {
                        onError(err instanceof Error ? err.message : 'Το ανέβασμα απέτυχε.');
                      }
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button className={btn} onClick={save} disabled={busy}>
          {busy ? 'Αποθήκευση...' : 'Αποθήκευση εικόνων'}
        </button>
      </div>
    </div>
  );
}

function PhotoGrid({
  items,
  onMove,
  onRemove
}: {
  items: { id: string; src: string }[];
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
      {items.map((item, i) => (
        <div key={item.id} className="relative overflow-hidden rounded-lg bg-ink-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.src} alt="" className="aspect-square w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink/80 px-1.5 py-1 text-[11px] text-bone-dim">
            <button className="px-1 hover:text-bone disabled:opacity-30" disabled={i === 0}
              onClick={() => onMove(i, -1)} aria-label="Μετακίνηση πίσω">←</button>
            <button className="px-1 hover:text-red-300" onClick={() => onRemove(item.id)} aria-label="Διαγραφή">✕</button>
            <button className="px-1 hover:text-bone disabled:opacity-30" disabled={i === items.length - 1}
              onClick={() => onMove(i, 1)} aria-label="Μετακίνηση μπροστά">→</button>
          </div>
        </div>
      ))}
    </div>
  );
}
