"use client";

import { useLang } from "./LanguageProvider";
import { dict, LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LABEL: Record<Locale, string> = { en: "EN", el: "ΕΛ" };

/** Compact EN / ΕΛ switch. `scrolled` tunes colours to the nav background. */
export function LanguageToggle({ scrolled = false }: { scrolled?: boolean }) {
  const { locale, setLocale, t } = useLang();

  return (
    <div
      role="group"
      aria-label={t.a11y.language}
      className={cn(
        "flex items-center gap-0.5 rounded-full border p-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-300",
        scrolled ? "border-azure/30" : "border-white/40",
      )}
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2 py-1 leading-none transition-colors duration-300",
              active
                ? scrolled
                  ? "bg-azure/15 text-azure-deep"
                  : "bg-white/20 text-white"
                : scrolled
                  ? "text-ink/45 hover:text-ink/80"
                  : "text-white/55 hover:text-white/90",
            )}
          >
            {LABEL[l]}
          </button>
        );
      })}
    </div>
  );
}
