"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-primary/15 bg-background/60 p-0.5 text-xs font-semibold",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {(["el", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "rounded-full px-3 py-1.5 uppercase tracking-wide transition-colors",
            lang === l
              ? "bg-primary text-primary-foreground shadow-soft"
              : "text-muted-foreground hover:text-primary",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
