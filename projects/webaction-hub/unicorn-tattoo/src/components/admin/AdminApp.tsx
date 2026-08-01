'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { btn, btnGhost, card, field, label } from './ui';
import TextsEditor from './TextsEditor';
import ArtistsEditor from './ArtistsEditor';
import MediaEditor from './MediaEditor';
import StudiosEditor from './StudiosEditor';

type Tab = 'texts' | 'artists' | 'media' | 'studios';

const TABS: { id: Tab; title: string }[] = [
  { id: 'texts', title: 'Κείμενα' },
  { id: 'artists', title: 'Καλλιτέχνες' },
  { id: 'media', title: 'Εικόνες' },
  { id: 'studios', title: 'Στούντιο' }
];

export default function AdminApp() {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('texts');
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const showToast = useCallback((text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  /** Called by every editor after a successful save: publish the change. */
  const publish = useCallback(async () => {
    try {
      const token = session?.access_token;
      if (!token) throw new Error('no session');
      const res = await fetch('/api/revalidate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(String(res.status));
      showToast('Αποθηκεύτηκε και δημοσιεύτηκε. Η σελίδα ανανεώνεται σε λίγα δευτερόλεπτα.');
    } catch {
      showToast(
        'Αποθηκεύτηκε, αλλά η δημοσίευση απέτυχε. Οι αλλαγές θα εμφανιστούν σε έως μία ώρα.',
        true
      );
    }
  }, [session, showToast]);

  if (!supabase) {
    return (
      <Shell>
        <div className={card}>
          <p className="text-sm text-bone-dim">
            Το Supabase δεν έχει ρυθμιστεί. Συμπλήρωσε τα NEXT_PUBLIC_SUPABASE_URL και
            NEXT_PUBLIC_SUPABASE_ANON_KEY στο περιβάλλον και ξαναχτίσε το site.
          </p>
        </div>
      </Shell>
    );
  }

  if (session === undefined) {
    return (
      <Shell>
        <p className="text-sm text-bone-dim">Φόρτωση...</p>
      </Shell>
    );
  }

  if (!session) {
    return (
      <Shell>
        <LoginForm />
      </Shell>
    );
  }

  return (
    <Shell
      right={
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-bone-faint sm:block">{session.user.email}</span>
          <button className={btnGhost} onClick={() => supabase.auth.signOut()}>
            Αποσύνδεση
          </button>
        </div>
      }
    >
      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Ενότητες">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={
              tab === item.id
                ? 'rounded-full border border-violet bg-violet/15 px-5 py-2 text-[11px] uppercase tracking-kicker text-bone'
                : 'rounded-full border border-white/15 px-5 py-2 text-[11px] uppercase tracking-kicker text-bone-dim hover:border-white/40 hover:text-bone'
            }
          >
            {item.title}
          </button>
        ))}
      </nav>

      {tab === 'texts' && <TextsEditor supabase={supabase} onSaved={publish} onError={(m) => showToast(m, true)} />}
      {tab === 'artists' && <ArtistsEditor supabase={supabase} onSaved={publish} onError={(m) => showToast(m, true)} />}
      {tab === 'media' && <MediaEditor supabase={supabase} onSaved={publish} onError={(m) => showToast(m, true)} />}
      {tab === 'studios' && <StudiosEditor supabase={supabase} onSaved={publish} onError={(m) => showToast(m, true)} />}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 w-[min(92vw,480px)] -translate-x-1/2 rounded-xl border px-5 py-3.5 text-sm shadow-xl ${
            toast.error
              ? 'border-red-400/40 bg-[#2a1212] text-red-200'
              : 'border-violet/40 bg-ink-800 text-bone'
          }`}
        >
          {toast.text}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-bone-faint">Unicorn Tattoo</p>
          <h1 className="mt-1 text-2xl font-semibold text-bone">Διαχείριση περιεχομένου</h1>
        </div>
        {right}
      </header>
      {children}
    </div>
  );
}

function LoginForm() {
  const supabase = getSupabase()!;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError('Λάθος στοιχεία σύνδεσης. Δοκίμασε ξανά.');
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className={`${card} mx-auto max-w-sm`}>
      <h2 className="mb-5 text-lg font-semibold text-bone">Σύνδεση ιδιοκτήτη</h2>
      <div className="mb-4">
        <label className={label} htmlFor="a-email">Email</label>
        <input
          id="a-email"
          type="email"
          autoComplete="username"
          className={field}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="mb-5">
        <label className={label} htmlFor="a-pass">Κωδικός</label>
        <input
          id="a-pass"
          type="password"
          autoComplete="current-password"
          className={field}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
      <button type="submit" className={btn} disabled={busy}>
        {busy ? 'Σύνδεση...' : 'Σύνδεση'}
      </button>
    </form>
  );
}
