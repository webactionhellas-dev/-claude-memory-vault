"use client";

import * as React from "react";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/language-provider";
import { site } from "@/lib/site";
import { whatsappHref } from "@/lib/utils";

export function WhatsappButton() {
  const { lang } = useLanguage();
  const message =
    lang === "el"
      ? "Γεια σας! Θα ήθελα πληροφορίες για τις υπηρεσίες σας."
      : "Hello! I'd like information about your services.";

  return (
    <motion.a
      href={whatsappHref(site.whatsapp, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-[#25D366] py-3 pl-3 pr-3 text-white shadow-lift transition-all hover:pr-5 sm:bottom-7 sm:right-7"
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 motion-safe:animate-ping" aria-hidden />
      <span className="relative flex h-9 w-9 items-center justify-center">
        <MessageCircle className="h-7 w-7" fill="currentColor" stroke="none" />
      </span>
      <span className="relative hidden max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-[120px] sm:inline">
        WhatsApp
      </span>
    </motion.a>
  );
}
