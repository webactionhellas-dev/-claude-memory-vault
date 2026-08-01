'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArtistRow, PortfolioItemRow } from '@/lib/cms/types';
import { uploadImage } from './upload';
import { btn, btnDanger, btnGhost, card, field, label } from './ui';

/**
 * Artists and their portfolios: every field editable, portrait replaceable,
 * works can be added (with client-side compression), reordered, hidden or
 * deleted. Each artist card saves independently.
 */

const LOCATION_OPTIONS = [
  { id: 'glyfada', title: 'Γλυφάδα' },
  { id: 'corfu', title: 'Κέρκυρα' }
] as const;

interface WorkingArtist extends ArtistRow {
  items: PortfolioItemRow[];
  removedItemIds: string[];
  isNew?: boolean;
}

function toWorking(row: ArtistRow, items: PortfolioItemRow[]): WorkingArtist {
  return { ...row, items, removedItemIds: [] };
}

export default function ArtistsEditor({
  supabase,
  onSaved,
  onError
}: {
  supabase: SupabaseClient;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [artists, setArtists] = useState<WorkingArtist[] | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const load = async () => {
    const [a, i] = await Promise.all([
      supabase.from('artists').select('*').order('sort').order('slug'),
      supabase.from('portfolio_items').select('*').order('sort').order('id')
    ]);
    if (a.error || i.error) {
      onError('Αποτυχία φόρτωσης καλλιτεχνών από τη βάση.');
      setArtists([]);
      return;
    }
    const items = (i.data ?? []) as PortfolioItemRow[];
    setArtists(
      ((a.data ?? []) as ArtistRow[]).map((row) =>
        toWorking(row, items.filter((it) => it.artist_slug === row.slug))
      )
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const update = (slug: string, patch: Partial<WorkingArtist>) => {
    setArtists((prev) =>
      prev ? prev.map((a) => (a.slug === slug ? { ...a, ...patch } : a)) : prev
    );
  };

  const moveArtist = (slug: string, dir: -1 | 1) => {
    setArtists((prev) => {
      if (!prev) return prev;
      const idx = prev.findIndex((a) => a.slug === slug);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((a, i) => ({ ...a, sort: i }));
    });
  };

  const addArtist = () => {
    const slug = window.prompt(
      'Σύντομο όνομα URL για τον νέο καλλιτέχνη (μόνο λατινικά πεζά, παύλες, π.χ. "maria-k"):'
    );
    if (!slug) return;
    if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) {
      onError('Μη έγκυρο όνομα URL. Επιτρέπονται λατινικά πεζά, αριθμοί και παύλες.');
      return;
    }
    setArtists((prev) => {
      if (!prev) return prev;
      if (prev.some((a) => a.slug === slug)) {
        onError('Υπάρχει ήδη καλλιτέχνης με αυτό το όνομα URL.');
        return prev;
      }
      return [
        ...prev,
        {
          slug,
          name: '',
          styles: [],
          locations: ['glyfada'],
          portrait: '',
          bio_el: '',
          bio_en: '',
          instagram: null,
          sort: prev.length,
          visible: true,
          items: [],
          removedItemIds: [],
          isNew: true
        }
      ];
    });
  };

  const removeArtist = async (artist: WorkingArtist) => {
    if (artist.isNew) {
      setArtists((prev) => (prev ? prev.filter((a) => a.slug !== artist.slug) : prev));
      return;
    }
    const sure = window.confirm(
      `Οριστική διαγραφή του "${artist.name || artist.slug}" και όλων των έργων του;`
    );
    if (!sure) return;
    setBusySlug(artist.slug);
    const { error } = await supabase.from('artists').delete().eq('slug', artist.slug);
    setBusySlug(null);
    if (error) {
      onError('Η διαγραφή απέτυχε.');
      return;
    }
    setArtists((prev) => (prev ? prev.filter((a) => a.slug !== artist.slug) : prev));
    onSaved();
  };

  const uploadPortrait = async (artist: WorkingArtist, file: File) => {
    setBusySlug(artist.slug);
    try {
      const { url } = await uploadImage(supabase, 'artists', file);
      update(artist.slug, { portrait: url });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Το ανέβασμα απέτυχε.');
    } finally {
      setBusySlug(null);
    }
  };

  const addWorks = async (artist: WorkingArtist, files: FileList) => {
    setBusySlug(artist.slug);
    try {
      const added: PortfolioItemRow[] = [];
      for (const file of Array.from(files)) {
        const { url, ar } = await uploadImage(supabase, 'work', file);
        added.push({
          id: crypto.randomUUID(),
          artist_slug: artist.slug,
          src: url,
          ar,
          sort: artist.items.length + added.length,
          visible: true
        });
      }
      update(artist.slug, { items: [...artist.items, ...added] });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Το ανέβασμα απέτυχε.');
    } finally {
      setBusySlug(null);
    }
  };

  const moveItem = (artist: WorkingArtist, id: string, dir: -1 | 1) => {
    const idx = artist.items.findIndex((it) => it.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= artist.items.length) return;
    const items = [...artist.items];
    [items[idx], items[target]] = [items[target], items[idx]];
    update(artist.slug, { items: items.map((it, i) => ({ ...it, sort: i })) });
  };

  const saveArtist = async (artist: WorkingArtist) => {
    if (!artist.name.trim()) {
      onError('Το όνομα του καλλιτέχνη δεν μπορεί να είναι κενό.');
      return;
    }
    setBusySlug(artist.slug);
    try {
      const { error: aErr } = await supabase.from('artists').upsert({
        slug: artist.slug,
        name: artist.name.trim(),
        styles: artist.styles,
        locations: artist.locations,
        portrait: artist.portrait,
        bio_el: artist.bio_el,
        bio_en: artist.bio_en,
        instagram: artist.instagram || null,
        sort: artist.sort,
        visible: artist.visible
      });
      if (aErr) throw aErr;

      if (artist.removedItemIds.length > 0) {
        const { error } = await supabase
          .from('portfolio_items')
          .delete()
          .in('id', artist.removedItemIds);
        if (error) throw error;
      }
      if (artist.items.length > 0) {
        const { error } = await supabase.from('portfolio_items').upsert(
          artist.items.map((it, i) => ({
            id: it.id,
            artist_slug: artist.slug,
            src: it.src,
            ar: it.ar,
            sort: i,
            visible: it.visible
          }))
        );
        if (error) throw error;
      }
      // Persist the display order of every other artist too (reordering the
      // list touches all sort values, not only the saved card's).
      const others = (artists ?? []).filter((a) => a.slug !== artist.slug && !a.isNew);
      await Promise.all(
        others.map((o) =>
          supabase.from('artists').update({ sort: o.sort }).eq('slug', o.slug)
        )
      );
      update(artist.slug, { removedItemIds: [], isNew: false });
      onSaved();
    } catch {
      onError('Η αποθήκευση απέτυχε. Δοκίμασε ξανά.');
    } finally {
      setBusySlug(null);
    }
  };

  if (!artists) return <p className="text-sm text-bone-dim">Φόρτωση καλλιτεχνών...</p>;

  return (
    <div className="space-y-4">
      {artists.map((artist, idx) => {
        const busy = busySlug === artist.slug;
        return (
          <details key={artist.slug} className={card} open={artist.isNew}>
            <summary className="flex cursor-pointer select-none items-center justify-between gap-3">
              <span className="text-sm font-semibold text-bone">
                {artist.name || artist.slug}
                {!artist.visible && (
                  <span className="ml-2 text-[11px] font-normal text-bone-faint">(κρυφός)</span>
                )}
              </span>
              <span className="flex items-center gap-1 text-bone-faint">
                <button
                  className="px-2 py-1 hover:text-bone disabled:opacity-30"
                  onClick={(e) => { e.preventDefault(); moveArtist(artist.slug, -1); }}
                  disabled={idx === 0}
                  aria-label="Μετακίνηση πάνω"
                >
                  ↑
                </button>
                <button
                  className="px-2 py-1 hover:text-bone disabled:opacity-30"
                  onClick={(e) => { e.preventDefault(); moveArtist(artist.slug, 1); }}
                  disabled={idx === artists.length - 1}
                  aria-label="Μετακίνηση κάτω"
                >
                  ↓
                </button>
              </span>
            </summary>

            <div className="mt-5 grid gap-5 lg:grid-cols-[180px_1fr]">
              <div>
                <span className={label}>Πορτρέτο</span>
                <div className="relative aspect-[7/10] w-full overflow-hidden rounded-lg bg-ink-700">
                  {artist.portrait && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artist.portrait} alt={artist.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <label className={`${btnGhost} mt-3 cursor-pointer`}>
                  Αλλαγή φωτογραφίας
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPortrait(artist, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Όνομα</label>
                  <input
                    className={field}
                    value={artist.name}
                    onChange={(e) => update(artist.slug, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={label}>Στυλ (χωρισμένα με κόμμα)</label>
                  <input
                    className={field}
                    value={artist.styles.join(', ')}
                    onChange={(e) =>
                      update(artist.slug, {
                        styles: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      })
                    }
                  />
                </div>
                <div>
                  <span className={label}>Στούντιο</span>
                  <div className="flex gap-4 pt-1">
                    {LOCATION_OPTIONS.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 text-sm text-bone-dim">
                        <input
                          type="checkbox"
                          checked={artist.locations.includes(opt.id)}
                          onChange={(e) =>
                            update(artist.slug, {
                              locations: e.target.checked
                                ? [...artist.locations, opt.id]
                                : artist.locations.filter((l) => l !== opt.id)
                            })
                          }
                        />
                        {opt.title}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={label}>Instagram (προαιρετικό)</label>
                  <input
                    className={field}
                    value={artist.instagram ?? ''}
                    onChange={(e) => update(artist.slug, { instagram: e.target.value || null })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Βιογραφικό (Ελληνικά)</label>
                  <textarea
                    className={`${field} resize-y`}
                    rows={3}
                    value={artist.bio_el}
                    onChange={(e) => update(artist.slug, { bio_el: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Βιογραφικό (Αγγλικά)</label>
                  <textarea
                    className={`${field} resize-y`}
                    rows={3}
                    value={artist.bio_en}
                    onChange={(e) => update(artist.slug, { bio_en: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-bone-dim">
                  <input
                    type="checkbox"
                    checked={artist.visible}
                    onChange={(e) => update(artist.slug, { visible: e.target.checked })}
                  />
                  Ορατός στο site
                </label>
              </div>
            </div>

            <div className="mt-6 border-t border-white/5 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className={label}>Έργα ({artist.items.length})</span>
                <label className={`${btnGhost} cursor-pointer`}>
                  Προσθήκη φωτογραφιών
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) addWorks(artist, e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                {artist.items.map((item, i) => (
                  <div
                    key={item.id}
                    className={`group relative overflow-hidden rounded-lg bg-ink-700 ${item.visible ? '' : 'opacity-40'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.src} alt="" className="aspect-square w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink/80 px-1.5 py-1 text-[11px] text-bone-dim">
                      <button
                        className="px-1 hover:text-bone disabled:opacity-30"
                        onClick={() => moveItem(artist, item.id, -1)}
                        disabled={i === 0}
                        aria-label="Μετακίνηση πίσω"
                      >
                        ←
                      </button>
                      <button
                        className="px-1 hover:text-bone"
                        title={item.visible ? 'Απόκρυψη' : 'Εμφάνιση'}
                        onClick={() =>
                          update(artist.slug, {
                            items: artist.items.map((it) =>
                              it.id === item.id ? { ...it, visible: !it.visible } : it
                            )
                          })
                        }
                      >
                        {item.visible ? '◎' : '○'}
                      </button>
                      <button
                        className="px-1 hover:text-red-300"
                        title="Διαγραφή"
                        onClick={() =>
                          update(artist.slug, {
                            items: artist.items.filter((it) => it.id !== item.id),
                            removedItemIds: [...artist.removedItemIds, item.id]
                          })
                        }
                      >
                        ✕
                      </button>
                      <button
                        className="px-1 hover:text-bone disabled:opacity-30"
                        onClick={() => moveItem(artist, item.id, 1)}
                        disabled={i === artist.items.length - 1}
                        aria-label="Μετακίνηση μπροστά"
                      >
                        →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-5">
              <button className={btnDanger} onClick={() => removeArtist(artist)} disabled={busy}>
                Διαγραφή καλλιτέχνη
              </button>
              <button className={btn} onClick={() => saveArtist(artist)} disabled={busy}>
                {busy ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </button>
            </div>
          </details>
        );
      })}

      <button className={btnGhost} onClick={addArtist}>
        + Νέος καλλιτέχνης
      </button>
    </div>
  );
}
