"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { MapPin, Navigation, Phone } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { stores } from "@/lib/data";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { telHref, cn } from "@/lib/utils";

// Leaflet touches `window`, so it must never render on the server.
const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] w-full items-center justify-center bg-secondary text-sm text-muted-foreground">
      …
    </div>
  ),
});

function mapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function StoreMap({
  withHeading = true,
  index,
}: {
  withHeading?: boolean;
  index?: string;
}) {
  const { t, tr, lang } = useLanguage();
  const [selectedId, setSelectedId] = React.useState<string | null>(stores[0].id);

  return (
    <section id="stores" className="section">
      <div className="container">
        {withHeading && (
          <SectionHeading
            index={index}
            eyebrow={t.sections.storesEyebrow}
            title={t.sections.storesTitle}
            subtitle={t.sections.storesSubtitle}
          />
        )}

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Store list */}
          <div className="order-2 grid max-h-[520px] gap-3 overflow-y-auto pr-1 lg:order-1">
            {stores.map((s) => {
              const active = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "rounded-2xl border bg-card p-5 text-left shadow-soft transition-all active:scale-[0.99]",
                    active
                      ? "border-primary/40 ring-1 ring-primary/20"
                      : "border-border/60 hover:border-primary/25",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                          active ? "bg-primary text-primary-foreground" : "bg-primary/8 text-primary",
                        )}
                      >
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{tr(s.name)}</h3>
                          {s.badge && (
                            <Badge variant="gold" className="px-2 py-0.5 text-[0.65rem]">
                              {tr(s.badge)}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{tr(s.address)}</p>
                        <p className="mt-1 text-xs text-muted-foreground/80">{tr(s.hours)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {s.phones.map((p) => (
                      <a
                        key={p}
                        href={telHref(p)}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <Phone className="h-3 w-3" />
                        {p}
                      </a>
                    ))}
                    <a
                      href={mapsUrl(`${tr(s.name)} ${tr(s.address)}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <Navigation className="h-3 w-3" />
                      {t.common.getDirections}
                    </a>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Map */}
          <div className="isolate relative z-0 order-1 overflow-hidden rounded-3xl border border-border/60 shadow-soft lg:order-2">
            <LeafletMap stores={stores} selectedId={selectedId} onSelect={setSelectedId} lang={lang} />
          </div>
        </div>
      </div>
    </section>
  );
}
