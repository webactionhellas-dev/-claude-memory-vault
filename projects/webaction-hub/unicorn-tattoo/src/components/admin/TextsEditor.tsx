'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import elMessages from '@/messages/el.json';
import enMessages from '@/messages/en.json';
import { flattenMessages, type MessageTree } from '@/lib/cms/flatten';
import { btn, btnGhost, card, field } from './ui';

/**
 * Every UI text of the site, EL and EN side by side, grouped by section.
 * The bundled JSON is the default; saving stores only the keys that differ
 * (sparse overrides). Reset deletes the override and returns to the default.
 */

const GROUP_TITLES: Record<string, string> = {
  meta: 'SEO και μεταδεδομένα',
  nav: 'Μενού πλοήγησης',
  common: 'Κοινά κουμπιά',
  galleryCat: 'Κατηγορίες γκαλερί',
  hero: 'Αρχική: πρώτη οθόνη',
  intro: 'Αρχική: εισαγωγή',
  featured: 'Αρχική: επιλεγμένα έργα',
  specialties: 'Ειδικότητες',
  artists: 'Αρχική: καλλιτέχνες',
  instagram: 'Ενότητα Instagram',
  locations: 'Ενότητα τοποθεσιών',
  ctaFooter: 'Πρόσκληση για κράτηση',
  footer: 'Υποσέλιδο',
  pages: 'Εσωτερικές σελίδες',
  shop: 'E-shop',
  cart: 'Καλάθι',
  booking: 'Φόρμα κράτησης'
};

const EL_DEFAULTS = flattenMessages(elMessages as MessageTree);
const EN_DEFAULTS = flattenMessages(enMessages as MessageTree);
const ALL_KEYS = Object.keys(EL_DEFAULTS);

type Locale = 'el' | 'en';
const mapKey = (locale: Locale, key: string) => `${locale}|${key}`;

export default function TextsEditor({
  supabase,
  onSaved,
  onError
}: {
  supabase: SupabaseClient;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [overrides, setOverrides] = useState<Map<string, string> | null>(null);
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('key,locale,value');
      if (cancelled) return;
      if (error) {
        onError('Αποτυχία φόρτωσης κειμένων από τη βάση.');
        setOverrides(new Map());
        return;
      }
      const map = new Map<string, string>();
      for (const row of data ?? []) {
        map.set(mapKey(row.locale as Locale, row.key as string), row.value as string);
      }
      setOverrides(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, onError]);

  const bundled = (locale: Locale, key: string) =>
    (locale === 'el' ? EL_DEFAULTS : EN_DEFAULTS)[key] ?? '';

  const currentValue = (locale: Locale, key: string) => {
    const k = mapKey(locale, key);
    if (edits.has(k)) return edits.get(k)!;
    if (overrides?.has(k)) return overrides.get(k)!;
    return bundled(locale, key);
  };

  const setValue = (locale: Locale, key: string, value: string) => {
    setEdits((prev) => {
      const next = new Map(prev);
      const saved = overrides?.get(mapKey(locale, key)) ?? bundled(locale, key);
      if (value === saved) next.delete(mapKey(locale, key));
      else next.set(mapKey(locale, key), value);
      return next;
    });
  };

  const isModified = (key: string) =>
    (['el', 'en'] as Locale[]).some(
      (locale) => currentValue(locale, key) !== bundled(locale, key)
    );

  const resetKey = async (key: string) => {
    setBusy(true);
    const { error } = await supabase.from('site_content').delete().eq('key', key);
    if (error) {
      onError('Η επαναφορά απέτυχε.');
      setBusy(false);
      return;
    }
    setOverrides((prev) => {
      const next = new Map(prev);
      next.delete(mapKey('el', key));
      next.delete(mapKey('en', key));
      return next;
    });
    setEdits((prev) => {
      const next = new Map(prev);
      next.delete(mapKey('el', key));
      next.delete(mapKey('en', key));
      return next;
    });
    setBusy(false);
    onSaved();
  };

  const save = async () => {
    if (edits.size === 0) return;
    setBusy(true);
    const upserts: { key: string; locale: Locale; value: string }[] = [];
    const deletions: { key: string; locale: Locale }[] = [];
    for (const [k, value] of edits) {
      const [locale, key] = [k.slice(0, 2) as Locale, k.slice(3)];
      if (value === bundled(locale, key)) deletions.push({ key, locale });
      else upserts.push({ key, locale, value });
    }
    try {
      if (upserts.length > 0) {
        const { error } = await supabase.from('site_content').upsert(upserts);
        if (error) throw error;
      }
      for (const del of deletions) {
        const { error } = await supabase
          .from('site_content')
          .delete()
          .eq('key', del.key)
          .eq('locale', del.locale);
        if (error) throw error;
      }
      setOverrides((prev) => {
        const next = new Map(prev);
        for (const row of upserts) next.set(mapKey(row.locale, row.key), row.value);
        for (const del of deletions) next.delete(mapKey(del.locale, del.key));
        return next;
      });
      setEdits(new Map());
      onSaved();
    } catch {
      onError('Η αποθήκευση απέτυχε. Δοκίμασε ξανά.');
    } finally {
      setBusy(false);
    }
  };

  const visibleKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_KEYS;
    return ALL_KEYS.filter(
      (key) =>
        key.toLowerCase().includes(q) ||
        EL_DEFAULTS[key]?.toLowerCase().includes(q) ||
        EN_DEFAULTS[key]?.toLowerCase().includes(q) ||
        currentValue('el', key).toLowerCase().includes(q) ||
        currentValue('en', key).toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, overrides, edits]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, string[]>();
    for (const key of visibleKeys) {
      const group = key.split('.')[0];
      const list = byGroup.get(group) ?? [];
      list.push(key);
      byGroup.set(group, list);
    }
    return byGroup;
  }, [visibleKeys]);

  if (!overrides) return <p className="text-sm text-bone-dim">Φόρτωση κειμένων...</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Αναζήτηση κειμένου ή κλειδιού..."
          className={`${field} max-w-sm`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-[11px] text-bone-faint">
          {visibleKeys.length} από {ALL_KEYS.length} κείμενα
        </span>
      </div>

      <div className="space-y-4">
        {[...groups.entries()].map(([group, keys]) => (
          <details key={group} className={card} open={Boolean(search)}>
            <summary className="cursor-pointer select-none text-sm font-semibold text-bone">
              {GROUP_TITLES[group] ?? group}
              <span className="ml-2 text-[11px] font-normal text-bone-faint">
                {keys.length} {keys.length === 1 ? 'κείμενο' : 'κείμενα'}
              </span>
            </summary>
            <div className="mt-4 space-y-5">
              {keys.map((key) => {
                const modified = isModified(key);
                return (
                  <div key={key} className="border-t border-white/5 pt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] text-bone-faint">
                        {key}
                        {modified && (
                          <span
                            className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-violet align-middle"
                            title="Διαφέρει από το αρχικό"
                          />
                        )}
                      </span>
                      {modified && (
                        <button
                          className="text-[11px] uppercase tracking-kicker text-bone-faint hover:text-violet"
                          onClick={() => resetKey(key)}
                          disabled={busy}
                        >
                          Επαναφορά αρχικού
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(['el', 'en'] as Locale[]).map((locale) => {
                        const value = currentValue(locale, key);
                        const rows = Math.min(6, Math.max(1, Math.ceil(value.length / 60)));
                        return (
                          <div key={locale}>
                            <span className="mb-1 block text-[10px] uppercase tracking-kicker text-bone-faint">
                              {locale === 'el' ? 'Ελληνικά' : 'Αγγλικά'}
                            </span>
                            <textarea
                              className={`${field} resize-y`}
                              rows={rows}
                              value={value}
                              onChange={(e) => setValue(locale, key, e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>

      <div className="sticky bottom-4 mt-8 flex items-center justify-end gap-3">
        {edits.size > 0 && (
          <>
            <button className={btnGhost} onClick={() => setEdits(new Map())} disabled={busy}>
              Ακύρωση αλλαγών
            </button>
            <button className={btn} onClick={save} disabled={busy}>
              {busy ? 'Αποθήκευση...' : `Αποθήκευση (${edits.size})`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
