"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Store } from "@/lib/data";

/** Brand-coloured SVG pin (no external marker image needed). */
function pin(active: boolean) {
  const fill = active ? "#B08D57" : "#0c4a37";
  return L.divIcon({
    className: "gc-pin",
    html: `
      <div style="transform:translate(-50%,-100%);${active ? "filter:drop-shadow(0 6px 10px rgba(176,141,87,.5));" : ""}">
        <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 0C7.6 0 0 7.5 0 16.8 0 29 17 44 17 44s17-15 17-27.2C34 7.5 26.4 0 17 0Z" fill="${fill}"/>
          <circle cx="17" cy="16.5" r="6.5" fill="#fff"/>
        </svg>
      </div>`,
    iconSize: [34, 44],
    iconAnchor: [0, 0],
    popupAnchor: [0, -42],
  });
}

function FitToStores({ stores }: { stores: Store[] }) {
  const map = useMap();
  React.useEffect(() => {
    const bounds = L.latLngBounds(stores.map((s) => [s.coords.lat, s.coords.lng]));
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, stores]);
  return null;
}

function FlyTo({ store }: { store: Store | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (store) map.flyTo([store.coords.lat, store.coords.lng], 14, { duration: 0.8 });
  }, [map, store]);
  return null;
}

export default function LeafletMap({
  stores,
  selectedId,
  onSelect,
  lang,
}: {
  stores: Store[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  lang: "el" | "en";
}) {
  const selected = stores.find((s) => s.id === selectedId) ?? null;

  return (
    <MapContainer
      center={[37.99, 23.86]}
      zoom={11}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ minHeight: 420 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FitToStores stores={stores} />
      <FlyTo store={selected} />
      {stores.map((s) => (
        <Marker
          key={s.id}
          position={[s.coords.lat, s.coords.lng]}
          icon={pin(s.id === selectedId)}
          eventHandlers={{ click: () => onSelect(s.id) }}
        >
          <Popup>
            <strong style={{ color: "#0c4a37" }}>{s.name[lang]}</strong>
            <br />
            {s.address[lang]}
            <br />
            <a href={`tel:${s.phones[0].replace(/\s/g, "")}`} style={{ color: "#B08D57", fontWeight: 600 }}>
              {s.phones[0]}
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
