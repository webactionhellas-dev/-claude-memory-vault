/**
 * ACME cart: framework-free, localStorage-backed.
 *
 * Line items carry a small display snapshot (name/brand/price/image) taken at
 * add-time, so the browser never has to download the product catalog just to
 * render the bag. State changes broadcast a `cart:change` event that the
 * drawer and the header badge listen to.
 */
export interface CartLine {
  id: string; // `${slug}::${size}`
  slug: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  size: string;
  qty: number;
}

export interface CartSnapshot {
  lines: CartLine[];
  count: number;
  subtotal: number;
}

const KEY = 'acme:cart:v1';
const lineId = (slug: string, size: string) => `${slug}::${size}`;

function read(): CartLine[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export const count = (lines: CartLine[] = read()): number =>
  lines.reduce((n, l) => n + l.qty, 0);

export const subtotal = (lines: CartLine[] = read()): number =>
  lines.reduce((s, l) => s + l.price * l.qty, 0);

function snapshot(lines = read()): CartSnapshot {
  return { lines, count: count(lines), subtotal: subtotal(lines) };
}

function broadcast(lines: CartLine[]) {
  window.dispatchEvent(new CustomEvent<CartSnapshot>('cart:change', { detail: snapshot(lines) }));
}

function write(lines: CartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines));
  broadcast(lines);
}

export const getCart = (): CartLine[] => read();
export const getSnapshot = (): CartSnapshot => snapshot();

export function addItem(item: Omit<CartLine, 'id' | 'qty'>, qty = 1) {
  const lines = read();
  const id = lineId(item.slug, item.size);
  const existing = lines.find((l) => l.id === id);
  if (existing) existing.qty += qty;
  else lines.push({ ...item, id, qty });
  write(lines);
  window.dispatchEvent(new CustomEvent('cart:added', { detail: { ...item, qty } }));
}

export function setQty(id: string, qty: number) {
  let lines = read();
  const line = lines.find((l) => l.id === id);
  if (!line) return;
  line.qty = Math.max(0, qty);
  lines = lines.filter((l) => l.qty > 0);
  write(lines);
}

export function removeItem(id: string) {
  write(read().filter((l) => l.id !== id));
}

export function clearCart() {
  write([]);
}

/** Call once on load so the badge/drawer hydrate, and sync across tabs. */
export function initCart() {
  broadcast(read());
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) broadcast(read());
  });
}

export const openCart = () => window.dispatchEvent(new Event('cart:open'));
export const closeCart = () => window.dispatchEvent(new Event('cart:close'));
