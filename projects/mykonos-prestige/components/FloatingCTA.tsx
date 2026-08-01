"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { site } from "@/lib/data";

export function FloatingCTA() {
  const [show, setShow] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Azure scroll-progress bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed inset-x-0 top-0 z-[130] h-[2px] origin-left bg-gradient-to-r from-sky via-azure to-azure-deep"
      />

      {/* Floating WhatsApp */}
      <AnimatePresence>
        {show && (
          <motion.a
            href={`https://wa.me/${site.whatsapp}?text=Hello%2C%20I%27d%20like%20to%20enquire%20about%20a%20private%20stay.`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            whileHover={{ scale: 1.08 }}
            className="fixed bottom-6 right-6 z-[130] flex h-14 w-14 items-center justify-center rounded-full bg-azure text-white shadow-azure"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-azure/40" />
            <MessageCircle size={24} className="relative" />
          </motion.a>
        )}
      </AnimatePresence>
    </>
  );
}
