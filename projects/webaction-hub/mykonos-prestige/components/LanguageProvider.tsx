"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { dict, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (typeof dict)[Locale];
};

const LanguageContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "mpv-locale";

function persist(l: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* ignore private-mode storage errors */
  }
  // Cookie so the SERVER renders the right language on the next load (no flash).
  document.cookie = `${STORAGE_KEY}=${l}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  // The server passes the cookie-derived locale, so SSR and first render already
  // match the visitor's choice (no flash of English).
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Transition safety net: if a visitor set the language before cookies existed
  // (localStorage only), adopt it once and write the cookie so it sticks.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if ((saved === "en" || saved === "el") && saved !== initialLocale) {
      setLocaleState(saved);
      persist(saved);
    }
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    persist(l);
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: dict[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
