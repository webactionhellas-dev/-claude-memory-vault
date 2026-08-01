"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { site } from "@/lib/data";
import { navFor } from "@/lib/i18n";
import { useLang } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { t, locale } = useLang();
  const nav = navFor(locale);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Fixed height (h-20) so nothing resizes on scroll. Only the backdrop
          fades in — no hard border line, just a soft shadow. */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[100] h-20 transition-[background-color,box-shadow,backdrop-filter] duration-500 ease-out",
          scrolled
            ? "bg-white/80 shadow-soft backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        {/* Soft gradient scrim at the very top for logo/link legibility over the hero */}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/30 to-transparent transition-opacity duration-500",
            scrolled ? "opacity-0" : "opacity-100",
          )}
        />

        <nav className="relative mx-auto flex h-full max-w-content items-center justify-between px-6 lg:px-10">
          {/* Logo — two versions crossfaded so the swap is seamless */}
          <Link href="/" className="relative z-10 flex items-center" aria-label={site.name}>
            <span className="relative block h-9 w-[190px]">
              <Image
                src="/media/real/logo-white.svg"
                alt={site.name}
                fill
                priority
                className={cn(
                  "object-contain object-left transition-opacity duration-500",
                  scrolled ? "opacity-0" : "opacity-100",
                )}
              />
              <Image
                src="/media/real/logo-ink.svg"
                alt=""
                fill
                aria-hidden
                className={cn(
                  "object-contain object-left transition-opacity duration-500",
                  scrolled ? "opacity-100" : "opacity-0",
                )}
              />
            </span>
          </Link>

          {/* Desktop links */}
          <ul className="hidden items-center gap-8 lg:flex">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative text-[0.72rem] uppercase tracking-wide2 transition-colors duration-300",
                    scrolled ? "text-ink/75 hover:text-ink" : "text-white/85 hover:text-white",
                  )}
                >
                  {item.label}
                  <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-azure transition-all duration-300 group-hover:w-full" />
                </Link>
              </li>
            ))}
          </ul>

          {/* CTA + burger */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <LanguageToggle scrolled={scrolled} />
            </div>
            <a
              href={site.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "hidden items-center rounded-sm border px-7 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.16em] transition-all duration-300 md:inline-flex",
                scrolled
                  ? "border-azure/50 text-azure-deep hover:border-azure hover:bg-azure/5"
                  : "border-white/60 text-white hover:border-white hover:bg-white/10",
              )}
            >
              {t.cta.bookNow}
            </a>
            <button
              className={cn(
                "transition-colors duration-300 lg:hidden",
                scrolled ? "text-ink" : "text-white",
              )}
              onClick={() => setOpen(true)}
              aria-label={t.a11y.openMenu}
            >
              <Menu size={26} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu — rendered OUTSIDE the blurred header so position:fixed
          is not trapped by the header's backdrop-filter ancestor. */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[110] flex flex-col bg-whisper lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex h-20 items-center justify-between px-6">
              <Image
                src="/media/real/logo-ink.svg"
                alt={site.name}
                width={170}
                height={42}
                className="h-9 w-auto"
              />
              <button onClick={() => setOpen(false)} aria-label={t.a11y.closeMenu} className="text-ink">
                <X size={28} />
              </button>
            </div>

            <ul className="flex flex-1 flex-col justify-center gap-2 px-8">
              {nav.map((item, i) => (
                <motion.li
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.07 * i + 0.1 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-haze py-4 font-display text-3xl font-light text-aegean"
                  >
                    {item.label}
                  </Link>
                </motion.li>
              ))}
            </ul>

            <div className="px-8 pb-12">
              <div className="mb-6 flex justify-center">
                <LanguageToggle scrolled />
              </div>
              <a
                href={site.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full"
                onClick={() => setOpen(false)}
              >
                {t.cta.bookYourStay}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
