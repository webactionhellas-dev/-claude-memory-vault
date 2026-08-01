import {
  Archive,
  BedDouble,
  CalendarCheck,
  Crown,
  Feather,
  Hotel,
  Layers,
  Leaf,
  PackageCheck,
  Recycle,
  ShieldCheck,
  Shirt,
  Sparkles,
  Truck,
  Umbrella,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

/** String → lucide icon map so data files can reference icons by name. */
const map: Record<string, LucideIcon> = {
  Archive,
  BedDouble,
  CalendarCheck,
  Crown,
  Feather,
  Hotel,
  Layers,
  Leaf,
  PackageCheck,
  Recycle,
  ShieldCheck,
  Shirt,
  Sparkles,
  Truck,
  Umbrella,
  WashingMachine,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = map[name] ?? Sparkles;
  return <Cmp className={className} aria-hidden="true" />;
}
