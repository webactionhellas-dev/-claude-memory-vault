"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, MessageCircle, Phone, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useLanguage } from "@/components/providers/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BookingModal } from "@/components/booking-modal";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { site } from "@/lib/site";
import { telHref, whatsappHref, cn } from "@/lib/utils";

export function Navbar() {
  const { t, lang } = useLanguage();
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => setOpenMenu(false), [pathname]);

  // Lock background scroll while the mobile menu is open.
  React.useEffect(() => {
    document.body.style.overflow = openMenu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [openMenu]);

  const links = [
    { href: "/ypiresies", label: t.nav.services },
    { href: "/times", label: t.nav.pricing },
    { href: "/katastimata", label: t.nav.stores },
    { href: "/pos-leitourgei", label: t.nav.how },
    { href: "/sxetika", label: t.nav.about },
    { href: "/epikoinonia", label: t.nav.contact },
  ];

  const waMessage =
    lang === "el" ? "Γεια σας! Θα ήθελα πληροφορίες." : "Hello! I'd like some information.";

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "glass-nav border-b border-border/60 py-2.5 shadow-soft" : "py-4",
        )}
      >
        <nav className="container flex items-center justify-between gap-4">
          <Link href="/" aria-label="Green Cleaners" className="shrink-0">
            <Logo />
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors",
                  pathname === l.href
                    ? "text-primary"
                    : "text-foreground/75 hover:text-primary hover:bg-primary/5",
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSwitcher />
            <a
              href={telHref(site.bookingPhone)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/70"
            >
              <Phone className="h-4 w-4" />
              {site.bookingPhone}
            </a>
            <BookingModal>
              <Button size="sm">{t.nav.book}</Button>
            </BookingModal>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher />
            <button
              onClick={() => setOpenMenu(true)}
              aria-label="Open menu"
              aria-expanded={openMenu}
              className="-mr-1 rounded-full p-2.5 text-primary transition-colors hover:bg-primary/5 active:scale-95"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu — rendered OUTSIDE <header> so the scrolled header's
          backdrop-filter never traps this fixed overlay (the see-through bug). */}
      <AnimatePresence>
        {openMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="noise fixed inset-0 z-[90] flex flex-col bg-background lg:hidden"
          >
            {/* atmosphere */}
            <div className="aurora -right-20 -top-10 h-72 w-72 bg-sage/50" />
            <div className="aurora -bottom-16 -left-16 h-72 w-72 bg-primary/10" style={{ animationDelay: "-6s" }} />

            <div className="container relative flex items-center justify-between py-4">
              <Logo />
              <button
                onClick={() => setOpenMenu(false)}
                aria-label="Close menu"
                className="rounded-full border border-border/60 bg-card p-2.5 text-primary shadow-soft transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <motion.nav
              className="container relative mt-2 flex flex-1 flex-col"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
            >
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    show: { opacity: 1, y: 0, transition: { ease: [0.22, 1, 0.36, 1] } },
                  }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpenMenu(false)}
                    className="group flex items-center justify-between border-b border-border/60 py-4"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="font-serif text-sm text-primary/40 tnum">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-serif text-3xl text-foreground transition-colors group-hover:text-primary">
                        {l.label}
                      </span>
                    </span>
                    <ArrowUpRight className="h-5 w-5 text-primary/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  </Link>
                </motion.div>
              ))}

              <motion.div
                variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
                className="mt-auto flex flex-col gap-3 py-8"
              >
                <BookingModal>
                  <Button size="lg" className="w-full">
                    {t.nav.book}
                  </Button>
                </BookingModal>
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild variant="whatsapp" size="lg">
                    <a href={whatsappHref(site.whatsapp, waMessage)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" />
                      {t.common.whatsapp}
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <a href={telHref(site.bookingPhone)}>
                      <Phone className="h-4 w-4" />
                      {lang === "el" ? "Κλήση" : "Call"}
                    </a>
                  </Button>
                </div>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
