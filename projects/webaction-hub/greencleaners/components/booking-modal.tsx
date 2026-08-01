"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// The form (RHF + Zod + date-fns + react-day-picker) is code-split and only
// fetched the first time a visitor opens the dialog — keeps it off the
// initial page load entirely.
const BookingFormContent = dynamic(
  () => import("@/components/booking-form-content").then((m) => m.BookingFormContent),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="sr-only">Loading…</span>
      </div>
    ),
  },
);

export function BookingModal({ children }: { children?: React.ReactNode }) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? <Button size="lg">{t.booking.open}</Button>}
      </DialogTrigger>
      <DialogContent>
        {open ? (
          <BookingFormContent />
        ) : (
          <DialogTitle className="sr-only">{t.booking.title}</DialogTitle>
        )}
      </DialogContent>
    </Dialog>
  );
}
