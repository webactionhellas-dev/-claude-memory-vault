'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LOCATIONS, type StudioLocation } from '@/lib/content';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'sending' | 'success' | 'error';

const field =
  'w-full rounded-lg border border-white/12 bg-ink-800 px-4 py-3 text-sm text-bone placeholder:text-bone-faint transition-colors duration-300 focus:border-violet focus:outline-none';
const label = 'mb-2 block text-[11px] uppercase tracking-kicker text-bone-dim';

export default function BookingForm({
  locations = LOCATIONS
}: {
  locations?: StudioLocation[];
}) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    studio: locations[0].id as string,
    service: 'tattoo',
    date: '',
    idea: ''
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mailtoFallback = () => {
    const loc = locations.find((l) => l.id === form.studio) ?? locations[0];
    const lines = [
      `${t('name')}: ${form.name}`,
      `${t('email')}: ${form.email}`,
      `${t('phone')}: ${form.phone}`,
      `${t('studio')}: ${form.studio}`,
      `${t('service')}: ${form.service}`,
      `${t('date')}: ${form.date}`,
      '',
      form.idea
    ].join('\n');
    window.location.href = `mailto:${loc.email}?subject=${encodeURIComponent(
      `Booking request: ${form.name}`
    )}&body=${encodeURIComponent(lines)}`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || !form.idea.trim()) {
      setError(t('required'));
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.ok) {
        setStatus('success');
      } else if (data.reason === 'validation') {
        setStatus('error');
        setError(t('error'));
      } else {
        // No provider, or the provider errored: open a pre-filled email rather than dead-end.
        mailtoFallback();
        setStatus('success');
      }
    } catch {
      // Network/parse failure: still give the visitor a way through.
      mailtoFallback();
      setStatus('success');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-violet/30 bg-violet/5 p-10 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-violet text-2xl text-violet">✓</span>
        <p className="max-w-sm text-lg leading-relaxed text-bone">{t('success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <div>
        <label className={label} htmlFor="b-name">{t('name')}</label>
        <input id="b-name" className={field} value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </div>
      <div>
        <label className={label} htmlFor="b-email">{t('email')}</label>
        <input id="b-email" type="email" className={field} value={form.email} onChange={(e) => set('email', e.target.value)} required />
      </div>
      <div>
        <label className={label} htmlFor="b-phone">{t('phone')} <span className="text-bone-faint">· {t('optional')}</span></label>
        <input id="b-phone" type="tel" className={field} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="b-date">{t('date')} <span className="text-bone-faint">· {t('optional')}</span></label>
        <input id="b-date" type="date" className={cn(field, '[color-scheme:dark]')} value={form.date} onChange={(e) => set('date', e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="b-studio">{t('studio')}</label>
        <select id="b-studio" className={field} value={form.studio} onChange={(e) => set('studio', e.target.value)}>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{locale === 'el' ? l.cityEl : l.city}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="b-service">{t('service')}</label>
        <select id="b-service" className={field} value={form.service} onChange={(e) => set('service', e.target.value)}>
          <option value="tattoo">{t('serviceTattoo')}</option>
          <option value="piercing">{t('servicePiercing')}</option>
          <option value="consultation">{t('serviceConsult')}</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="b-idea">{t('idea')}</label>
        <textarea id="b-idea" rows={4} className={cn(field, 'resize-none')} value={form.idea} onChange={(e) => set('idea', e.target.value)} required />
      </div>

      {error && <p className="text-sm text-violet sm:col-span-2">{error}</p>}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex items-center gap-2 rounded-full bg-bone px-8 py-4 text-[12px] uppercase tracking-kicker text-ink transition-colors duration-500 hover:bg-violet hover:text-bone disabled:opacity-60"
        >
          {status === 'sending' ? t('sending') : t('submit')}
        </button>
      </div>
    </form>
  );
}
