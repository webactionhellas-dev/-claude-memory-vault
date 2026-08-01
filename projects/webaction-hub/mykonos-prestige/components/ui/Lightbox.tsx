"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export type LightboxItem = { src?: string; tag: string; placeholder?: boolean };

type LightboxProps = {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onNav: (dir: 1 | -1) => void;
};

/** Full-screen gallery lightbox with keyboard nav. Rendered above everything. */
export function Lightbox({ items, index, onClose, onNav }: LightboxProps) {
  const open = index !== null;
  const item = open ? items[index] : null;

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav(1);
      if (e.key === "ArrowLeft") onNav(-1);
    },
    [onClose, onNav],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onKey]);

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-aegean-900/95 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <button
            className="absolute right-6 top-6 rounded-full border border-white/25 p-2 text-white/85 transition hover:border-sky hover:text-sky"
            onClick={onClose}
            aria-label="Close gallery"
          >
            <X size={22} />
          </button>

          <button
            className="absolute left-4 md:left-10 rounded-full border border-white/25 p-2 text-white/85 transition hover:border-sky hover:text-sky"
            onClick={(e) => {
              e.stopPropagation();
              onNav(-1);
            }}
            aria-label="Previous"
          >
            <ChevronLeft size={26} />
          </button>

          <motion.div
            key={index}
            className="relative mx-16 max-h-[82vh] w-full max-w-5xl"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {item.src && !item.placeholder ? (
              <Image
                src={item.src}
                alt={item.tag}
                width={1920}
                height={1200}
                quality={95}
                sizes="100vw"
                className="max-h-[82vh] w-full rounded-sm object-contain"
              />
            ) : (
              <div className="ph flex aspect-[3/2] items-center justify-center rounded-sm">
                <span className="ph-tag !text-xs">
                  Replace with @mykonosprestigevillas · {item.tag}
                </span>
              </div>
            )}
            <p className="mt-4 text-center text-xs uppercase tracking-wide2 text-sky">
              {item.tag}
            </p>
          </motion.div>

          <button
            className="absolute right-4 md:right-10 rounded-full border border-white/25 p-2 text-white/85 transition hover:border-sky hover:text-sky"
            onClick={(e) => {
              e.stopPropagation();
              onNav(1);
            }}
            aria-label="Next"
          >
            <ChevronRight size={26} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
