import { useEffect, useState } from 'react';
import { api } from './api';
import { withTax } from './format';
import { useStore } from './store';

// The store's free-delivery amount (whole rupees, or null when it has none), asked for once per app session and shared by every screen.
let value: number | null | undefined;
let asking: Promise<number | null> | null = null;
export function useFreeShipMin(): number | null {
  const [min, setMin] = useState(value);
  useEffect(() => {
    if (value !== undefined) return;
    (asking ??= api<{ min: number | null }>('/api/cart/free-shipping')
      .then((d) => (value = d.min ?? null))
      .catch(() => { asking = null; return null; })) // not remembered: the next screen asks again
      .then(setMin);
  }, []);
  return min ?? null;
}

// How far the cart is from free delivery (the same maths as the cart screen), or null when there is nothing to show.
export function useFreeShip(min: number | null | undefined) {
  const { cart } = useStore();
  if (!cart || !cart.items.length || min == null) return null;
  const m = cart.totals.currency_minor_unit;
  const have = withTax(cart.totals.total_items, cart.totals.total_items_tax);
  const need = min * 10 ** m;
  return { left: Math.max(0, need - have), pct: Math.min(1, have / need), m };
}
