'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StudioRow } from '@/lib/cms/types';
import { btn, card, field, label, sectionTitle } from './ui';

/** Studio details (address, phones, map listing) and the social links. */

const SOCIAL_KEYS = [
  { key: 'social.instagram', title: 'Instagram (σύνδεσμος)' },
  { key: 'social.instagramHandle', title: 'Instagram (όνομα, π.χ. @unicorn.tattoo)' },
  { key: 'social.facebook', title: 'Facebook (σύνδεσμος)' }
];

const FIELDS: { key: keyof StudioRow; title: string; span?: boolean }[] = [
  { key: 'city_el', title: 'Πόλη (Ελληνικά)' },
  { key: 'city', title: 'Πόλη (Αγγλικά)' },
  { key: 'street_el', title: 'Διεύθυνση (Ελληνικά)' },
  { key: 'street', title: 'Διεύθυνση (Αγγλικά)' },
  { key: 'note_el', title: 'Σημείωση (Ελληνικά, προαιρετική)' },
  { key: 'note', title: 'Σημείωση (Αγγλικά, προαιρετική)' },
  { key: 'postal_code', title: 'Τ.Κ.' },
  { key: 'region', title: 'Περιοχή (Αγγλικά)' },
  { key: 'phone', title: 'Τηλέφωνο' },
  { key: 'email', title: 'Email' },
  { key: 'maps_url', title: 'Σύνδεσμος Google Maps', span: true }
];

export default function StudiosEditor({
  supabase,
  onSaved,
  onError
}: {
  supabase: SupabaseClient;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [studios, setStudios] = useState<StudioRow[] | null>(null);
  const [social, setSocial] = useState<Map<string, string> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [st, se] = await Promise.all([
        supabase.from('studios').select('*').order('sort'),
        supabase.from('site_settings').select('key,value').like('key', 'social.%')
      ]);
      if (cancelled) return;
      if (st.error || se.error) {
        onError('Αποτυχία φόρτωσης στοιχείων στούντιο.');
        return;
      }
      setStudios((st.data ?? []) as StudioRow[]);
      setSocial(new Map((se.data ?? []).map((row) => [row.key as string, row.value as string])));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, onError]);

  const update = (id: string, patch: Partial<StudioRow>) => {
    setStudios((prev) => (prev ? prev.map((s) => (s.id === id ? { ...s, ...patch } : s)) : prev));
  };

  const save = async () => {
    if (!studios || !social) return;
    setBusy(true);
    try {
      const isHttpUrl = (v: string) => /^https?:\/\//i.test(v.trim());
      for (const studio of studios) {
        if (!studio.phone.trim() || !studio.email.trim()) {
          throw new Error('validation');
        }
        if (studio.maps_url.trim() && !isHttpUrl(studio.maps_url)) {
          throw new Error('url');
        }
      }
      // Social links must be plain http(s) URLs: this blocks a "javascript:"
      // link from ever being stored and later placed into an <a href>.
      for (const key of ['social.instagram', 'social.facebook']) {
        const v = social.get(key)?.trim();
        if (v && !isHttpUrl(v)) {
          throw new Error('url');
        }
      }
      // Send explicit columns (never updated_at: the trigger owns it).
      const { error } = await supabase.from('studios').upsert(
        studios.map((s) => ({
          id: s.id,
          city: s.city,
          city_el: s.city_el,
          street: s.street,
          street_el: s.street_el,
          postal_code: s.postal_code,
          region: s.region,
          note: s.note,
          note_el: s.note_el,
          phone: s.phone,
          email: s.email,
          lat: s.lat,
          lng: s.lng,
          place_ftid: s.place_ftid,
          place_name: s.place_name,
          maps_url: s.maps_url,
          sort: s.sort,
          visible: s.visible
        }))
      );
      if (error) throw error;
      const rows = [...social.entries()].map(([key, value]) => ({ key, value }));
      if (rows.length > 0) {
        const { error: sErr } = await supabase.from('site_settings').upsert(rows);
        if (sErr) throw sErr;
      }
      onSaved();
    } catch (err) {
      onError(
        err instanceof Error && err.message === 'validation'
          ? 'Τηλέφωνο και email δεν μπορούν να είναι κενά.'
          : err instanceof Error && err.message === 'url'
            ? 'Οι σύνδεσμοι πρέπει να ξεκινούν με http:// ή https://.'
            : 'Η αποθήκευση απέτυχε. Δοκίμασε ξανά.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (!studios || !social) return <p className="text-sm text-bone-dim">Φόρτωση στούντιο...</p>;

  return (
    <div className="space-y-6">
      {studios.map((studio) => (
        <section key={studio.id} className={card}>
          <h2 className={sectionTitle}>Στούντιο: {studio.city_el || studio.id}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(({ key, title, span }) => (
              <div key={key} className={span ? 'sm:col-span-2' : undefined}>
                <label className={label}>{title}</label>
                <input
                  className={field}
                  value={(studio[key] as string | null) ?? ''}
                  onChange={(e) => update(studio.id, { [key]: e.target.value } as Partial<StudioRow>)}
                />
              </div>
            ))}
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-[11px] uppercase tracking-kicker text-bone-faint">
              Τεχνικά στοιχεία χάρτη (μην τα αλλάξεις χωρίς λόγο)
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Γεωγραφικό πλάτος (lat)</label>
                <input
                  className={field}
                  type="number"
                  step="any"
                  value={studio.lat}
                  onChange={(e) => update(studio.id, { lat: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={label}>Γεωγραφικό μήκος (lng)</label>
                <input
                  className={field}
                  type="number"
                  step="any"
                  value={studio.lng}
                  onChange={(e) => update(studio.id, { lng: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={label}>Google place ftid</label>
                <input
                  className={field}
                  value={studio.place_ftid}
                  onChange={(e) => update(studio.id, { place_ftid: e.target.value })}
                />
              </div>
              <div>
                <label className={label}>Όνομα καταχώρισης Google</label>
                <input
                  className={field}
                  value={studio.place_name}
                  onChange={(e) => update(studio.id, { place_name: e.target.value })}
                />
              </div>
            </div>
          </details>
        </section>
      ))}

      <section className={card}>
        <h2 className={sectionTitle}>Κοινωνικά δίκτυα</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_KEYS.map(({ key, title }) => (
            <div key={key} className={key === 'social.facebook' ? 'sm:col-span-2' : undefined}>
              <label className={label}>{title}</label>
              <input
                className={field}
                value={social.get(key) ?? ''}
                onChange={(e) =>
                  setSocial((prev) => {
                    const next = new Map(prev);
                    next.set(key, e.target.value);
                    return next;
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button className={btn} onClick={save} disabled={busy}>
          {busy ? 'Αποθήκευση...' : 'Αποθήκευση στούντιο'}
        </button>
      </div>
    </div>
  );
}
