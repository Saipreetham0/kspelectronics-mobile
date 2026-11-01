import { fromStore, live } from '../src/components/BannerCarousel';
import { dealOf } from '../src/components/PromoGrid';

const now = Date.parse('2026-11-05T12:00:00+05:30');
test('a store banner runs only between its from and until dates', () => {
  expect(live({ id: 'a', title: 'A' }, now)).toBe(true);
  expect(live({ id: 'a', title: 'A', from: '2026-11-01', until: '2026-11-10' }, now)).toBe(true);
  expect(live({ id: 'a', title: 'A', from: '2026-11-06' }, now)).toBe(false);
  expect(live({ id: 'a', title: 'A', until: '2026-11-04' }, now)).toBe(false);
});

test('only https artwork is shown, and a store banner keeps its link and category', () => {
  expect(fromStore({ id: 'a', title: 'A', image: 'https://cdn.example/a.webp' }).image).toBe('https://cdn.example/a.webp');
  expect(fromStore({ id: 'a', title: 'A', image: 'http://cdn.example/a.webp' }).image).toBeUndefined();
  const b = fromStore({ id: 'd', title: 'Diwali', link: '/offers', category: 'raspberry-pi' });
  expect([b.link, b.slug, b.cta]).toEqual(['/offers', 'raspberry-pi', 'Shop now']);
});

const p = (price: number, regular = price) => ({ prices: { price: String(price * 100), regular_price: String(regular * 100), sale_price: '', currency_symbol: '₹', currency_minor_unit: 2, price_range: null } });
test('a promo tile quotes the real cheapest price and the biggest real discount', () => {
  expect(dealOf([p(69), p(150, 300), p(999)])).toEqual({ off: 50, from: 69 });
  expect(dealOf([p(120), p(200)])).toEqual({ off: 0, from: 120 });
  expect(dealOf([])).toBeNull();
  expect(dealOf([p(0)])).toBeNull();
});
