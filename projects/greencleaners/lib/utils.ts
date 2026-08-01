import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip spaces/dashes from a Greek phone number for tel: links. */
export function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+30${digits}`;
}

/** Build a wa.me link with a pre-filled, URL-encoded message. */
export function whatsappHref(phone: string, message?: string) {
  const number = phone.replace(/[^\d]/g, "");
  const base = `https://wa.me/${number.startsWith("30") ? number : `30${number}`}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
