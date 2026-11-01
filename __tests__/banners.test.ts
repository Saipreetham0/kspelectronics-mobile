import { fromStore, live } from '../src/components/BannerCarousel';

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
