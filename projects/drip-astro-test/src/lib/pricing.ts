import type { Product } from './products';

// Server-authoritative cart pricing. This is the security seam for checkout:
// the browser sends slugs + quantities, and the SERVER decides the price from
// its own catalog. Client-supplied prices are ignored entirely (never trust the
// client on money). Pure and dependency-free (type-only import of Product, which
// is erased at runtime) so it can be unit-tested without Stripe, Supabase, or the
// import.meta.env-dependent modules. See tests/pricing.test.ts.

export const MAX_QTY = 10;

export interface CartLine {
  slug: string;
  size?: string | number;
  qty?: number;
  image?: string;
  price?: number; // may be present from the client, DELIBERATELY IGNORED
}

export interface PricedItem {
  product_slug: string;
  name: string;
  brand: string;
  size: string;
  unit_price_cents: number;
  quantity: number;
  image: string;
}

/** Clamp a client-supplied quantity to a sane [1, MAX_QTY] integer-ish range. */
export function clampQty(qty: unknown): number {
  return Math.max(1, Math.min(MAX_QTY, Number(qty) || 1));
}

/**
 * Re-price cart lines from the authoritative server catalog.
 * - price comes ONLY from the catalog (client `price` is ignored),
 * - unknown slugs are dropped (never priced at zero),
 * - quantity is clamped to [1, MAX_QTY],
 * - unit price is rounded to whole cents (no float drift).
 * Returns the priced line items and the server-computed subtotal in cents.
 */
export function priceCart(
  catalog: Product[],
  lines: CartLine[],
): { items: PricedItem[]; subtotalCents: number } {
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const items: PricedItem[] = [];
  for (const l of lines) {
    const p = bySlug.get(l.slug);
    if (!p) continue;
    items.push({
      product_slug: p.slug,
      name: p.name,
      brand: p.brand,
      size: String(l.size ?? 'OS'),
      unit_price_cents: Math.round(p.price * 100),
      quantity: clampQty(l.qty),
      image: typeof l.image === 'string' ? l.image : '',
    });
  }
  const subtotalCents = items.reduce((s, it) => s + it.unit_price_cents * it.quantity, 0);
  return { items, subtotalCents };
}

/* ------------------------------------------------------------------ */
/* Strong customer authentication on high-value carts.                 */
/* ------------------------------------------------------------------ */

/** Above this subtotal we explicitly request 3D Secure (fraud posture). */
export const THREE_DS_THRESHOLD_CENTS = 50000;

/** True when the cart is valuable enough to force a 3DS challenge. */
export const needsStrongAuth = (subtotalCents: number): boolean =>
  subtotalCents >= THREE_DS_THRESHOLD_CENTS;
