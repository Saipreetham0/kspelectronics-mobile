import type { Cart } from './types';

// The cart as it will be after a line's quantity changes (0 removes the line), worked out here until the store's own answer arrives.
const amt = (v?: string) => Number(v ?? 0) || 0;
export function rework(cart: Cart, key: string, qty: number): Cart {
  const it = cart.items.find((i) => i.key === key);
  if (!it || it.quantity <= 0) return cart;
  const f = qty / it.quantity, line = amt(it.totals.line_total), tax = amt(it.totals.line_total_tax);
  const dl = Math.round(line * f) - line, dt = Math.round(tax * f) - tax;
  const bump = (v: string | undefined, d: number) => String(Math.round(amt(v) + d));
  const items = qty <= 0 ? cart.items.filter((i) => i.key !== key)
    : cart.items.map((i) => (i.key === key ? { ...i, quantity: qty, totals: { ...i.totals, line_total: String(Math.round(line * f)), line_total_tax: String(Math.round(tax * f)) } } : i));
  const t = cart.totals;
  return { ...cart, items, items_count: cart.items_count + (qty - it.quantity), totals: { ...t, total_items: bump(t.total_items, dl), total_items_tax: bump(t.total_items_tax, dt), total_tax: bump(t.total_tax, dt), total_price: bump(t.total_price, dl + dt) } };
}
