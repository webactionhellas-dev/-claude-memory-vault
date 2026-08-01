"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group rounded-2xl border border-border/70 bg-card text-foreground shadow-lift",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground rounded-full",
          cancelButton: "bg-muted text-muted-foreground rounded-full",
        },
      }}
      {...props}
    />
  );
}
