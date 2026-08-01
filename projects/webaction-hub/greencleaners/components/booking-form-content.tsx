"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { el as elLocale, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarIcon, Check, Loader2, MessageCircle, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";

import { useLanguage } from "@/components/providers/language-provider";
import { services } from "@/lib/data";
import { site } from "@/lib/site";
import { whatsappHref, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const schema = z.object({
  name: z.string().min(2, "required"),
  phone: z
    .string()
    .min(8, "required")
    .refine((v) => /^(\+?30)?[\s-]?(69\d{8}|2\d{9})$/.test(v.replace(/\s/g, "")), "phone"),
  email: z.string().email("email").optional().or(z.literal("")),
  address: z.string().min(4, "required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

/**
 * Heavy form internals (RHF + Zod + react-day-picker + date-fns), code-split
 * out of BookingModal so this only downloads when the dialog is opened.
 */
export function BookingFormContent() {
  const { t, tr, lang } = useLanguage();
  const [date, setDate] = React.useState<Date | undefined>();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [done, setDone] = React.useState(false);
  const [waLink, setWaLink] = React.useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const toggleService = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const resetAll = () => {
    reset();
    setDate(undefined);
    setSelected([]);
    setDone(false);
    setWaLink("");
  };

  const onSubmit = async (values: FormValues) => {
    const chosen = services.filter((s) => selected.includes(s.id)).map((s) => tr(s.title));
    const dateStr = date
      ? format(date, "PPP", { locale: lang === "el" ? elLocale : enUS })
      : lang === "el"
        ? "Δεν ορίστηκε"
        : "Not set";

    const lines =
      lang === "el"
        ? [
            "Γεια σας! Θα ήθελα να κλείσω δωρεάν παραλαβή.",
            `Όνομα: ${values.name}`,
            `Τηλέφωνο: ${values.phone}`,
            values.email ? `Email: ${values.email}` : "",
            `Διεύθυνση: ${values.address}`,
            `Ημερομηνία: ${dateStr}`,
            chosen.length ? `Υπηρεσίες: ${chosen.join(", ")}` : "",
            values.notes ? `Σημειώσεις: ${values.notes}` : "",
          ]
        : [
            "Hello! I'd like to book a free pickup.",
            `Name: ${values.name}`,
            `Phone: ${values.phone}`,
            values.email ? `Email: ${values.email}` : "",
            `Address: ${values.address}`,
            `Date: ${dateStr}`,
            chosen.length ? `Services: ${chosen.join(", ")}` : "",
            values.notes ? `Notes: ${values.notes}` : "",
          ];
    const message = lines.filter(Boolean).join("\n");
    setWaLink(whatsappHref(site.whatsapp, message));

    // Persist the request. The API route is a stub today. Wire it to Resend
    // (see app/api/booking/route.ts) to receive these by email.
    try {
      await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, date: dateStr, services: chosen }),
      });
    } catch {
      // WhatsApp fallback covers the lead even if email isn't configured.
    }

    setDone(true);
    toast.success(t.booking.successTitle, { description: t.booking.successText });
  };

  const err = (key?: string) => {
    if (!key) return null;
    const map: Record<string, string> = {
      required: t.booking.required,
      phone: lang === "el" ? "Μη έγκυρο τηλέφωνο" : "Invalid phone number",
      email: lang === "el" ? "Μη έγκυρο email" : "Invalid email",
    };
    return <p className="mt-1 text-xs text-destructive">{map[key] ?? t.booking.required}</p>;
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center py-6 text-center"
      >
        <DialogTitle className="sr-only">{t.booking.successTitle}</DialogTitle>
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PartyPopper className="h-8 w-8" />
        </div>
        <h3 className="font-serif text-2xl font-semibold">{t.booking.successTitle}</h3>
        <p className="mt-2 max-w-sm text-muted-foreground">{t.booking.successText}</p>
        <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="whatsapp" size="lg">
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              {t.booking.openWhatsapp}
            </a>
          </Button>
          <Button variant="outline" size="lg" onClick={resetAll}>
            {t.booking.another}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t.booking.title}</DialogTitle>
        <DialogDescription>{t.booking.subtitle}</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">{t.booking.name}</Label>
            <Input id="name" className="mt-1.5" placeholder={t.booking.namePh} {...register("name")} />
            {err(errors.name?.message)}
          </div>
          <div>
            <Label htmlFor="phone">{t.booking.phone}</Label>
            <Input id="phone" inputMode="tel" className="mt-1.5" placeholder={t.booking.phonePh} {...register("phone")} />
            {err(errors.phone?.message)}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">{t.booking.email}</Label>
            <Input id="email" type="email" className="mt-1.5" placeholder={t.booking.emailPh} {...register("email")} />
            {err(errors.email?.message)}
          </div>
          <div>
            <Label>{t.booking.date}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "mt-1.5 flex h-11 w-full items-center gap-2 rounded-xl border border-input bg-background/60 px-4 text-left text-sm shadow-sm transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring",
                    !date && "text-muted-foreground/70",
                  )}
                >
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {date
                    ? format(date, "PPP", { locale: lang === "el" ? elLocale : enUS })
                    : t.booking.datePick}
                </button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  lang={lang}
                  disabled={{ before: new Date() }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div>
          <Label htmlFor="address">{t.booking.address}</Label>
          <Input id="address" className="mt-1.5" placeholder={t.booking.addressPh} {...register("address")} />
          {err(errors.address?.message)}
        </div>

        <div>
          <Label className="mb-2 block">{t.booking.services}</Label>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => {
              const active = selected.includes(s.id);
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-primary",
                  )}
                >
                  {active && <Check className="h-3 w-3" />}
                  {tr(s.title)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="notes">{t.booking.notes}</Label>
          <Textarea id="notes" className="mt-1.5" placeholder={t.booking.notesPh} {...register("notes")} />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.booking.submitting}
            </>
          ) : (
            t.booking.submit
          )}
        </Button>
      </form>
    </>
  );
}
