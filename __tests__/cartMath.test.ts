import { rework } from '../src/cartMath';
import type { Cart } from '../src/types';

const cart = {
  items: [
    { key: 'a', id: 1, quantity: 2, name: 'x', sku: '', images: [], prices: {} as never, totals: { line_total: '20000', line_total_tax: '3600', currency_minor_unit: 2 } },
    { key: 'b', id: 2, quantity: 1, name: 'y', sku: '', images: [], prices: {} as never, totals: { line_total: '10000', line_total_tax: '1800', currency_minor_unit: 2 } },
  ],
  items_count: 3, coupons: [],
  totals: { total_items: '30000', total_items_tax: '5400', total_discount: '0', total_shipping: '0', total_tax: '5400', total_price: '35400', currency_minor_unit: 2, currency_symbol: '₹' },
} as unknown as Cart;

describe('optimistic cart', () => {
  test('raising a quantity scales the line and the totals', () => {
    const c = rework(cart, 'a', 3);
    expect(c.items[0].quantity).toBe(3);
    expect(c.items[0].totals.line_total).toBe('30000');
    expect(c.totals.total_items).toBe('40000');
    expect(c.totals.total_price).toBe('47200'); // 35400 + 10000 + 1800
    expect(c.items_count).toBe(4);
  });
  test('quantity 0 removes the line', () => {
    const c = rework(cart, 'b', 0);
    expect(c.items.map((i) => i.key)).toEqual(['a']);
    expect(c.totals.total_price).toBe('23600');
  });
  test('an unknown line leaves the cart as it was', () => expect(rework(cart, 'zzz', 5)).toBe(cart));
});
