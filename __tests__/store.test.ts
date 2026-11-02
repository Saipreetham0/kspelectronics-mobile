// The Zustand cart: add saves the token and counts items; a quantity change shows at once; logout empties it.
const mockMem = new Map<string, string>();
jest.mock('@/storage', () => ({ storage: {
  get: async (k: string) => mockMem.get(k) ?? null,
  set: async (k: string, v: string) => { mockMem.set(k, v); },
  del: async (k: string) => { mockMem.delete(k); },
} }));
jest.mock('@/analytics', () => ({ track: () => {} }));
jest.mock('@/location', () => ({ getLoc: async () => null, clearLoc: async () => {} }));
jest.mock('@/addresses', () => ({ clearAddresses: async () => {} }));
jest.mock('@/payRequest', () => ({ setPayRequest: async () => {} }));

const mockLine = (key: string, quantity: number) => ({ key, quantity, prices: { price: '100' }, totals: { line_total: String(100 * quantity) } });
const mockCart = (q: number) => ({ items: [mockLine('a', q)], totals: { total_items: String(100 * q), total_price: String(100 * q) } });
let mockResolveUpdate: (c: unknown) => void = () => {};
jest.mock('@/api', () => ({
  ...jest.requireActual('@/api'),
  api: jest.fn(async (path: string) => {
    if (path === '/api/cart/add') return { cart: mockCart(2), token: 'T1' };
    if (path === '/api/cart/update') return new Promise((r) => { mockResolveUpdate = r; });
    throw new Error(`unexpected ${path}`);
  }),
}));

import { useStore } from '@/store';

test('add, optimistic update, logout', async () => {
  await useStore.getState().addItem(1, 2);
  expect(useStore.getState().itemCount).toBe(2);
  expect(mockMem.get('ksp_cart_token')).toBe('T1');

  const pending = useStore.getState().updateItem('a', 5);
  expect(useStore.getState().itemCount).toBe(5); // shown before the store answers
  expect(useStore.getState().syncing).toBe(true);
  await new Promise((r) => setTimeout(r, 0));
  mockResolveUpdate(mockCart(5));
  await pending;
  expect(useStore.getState().syncing).toBe(false);

  await useStore.getState().logout();
  expect(useStore.getState().cart).toBeNull();
  expect(useStore.getState().itemCount).toBe(0);
  expect(mockMem.has('ksp_cart_token')).toBe(false);
});

test('ADD shows the line at once and takes it back if the store refuses', async () => {
  const { api } = jest.requireMock('@/api');
  let fail: (e: Error) => void = () => {};
  api.mockImplementationOnce(() => new Promise((_, rej) => { fail = rej; }));
  const p = { id: 7, name: 'ESP32', sku: '', images: [], prices: { price: '450', currency_minor_unit: 0, currency_symbol: '₹' } };
  const adding = useStore.getState().addItem(7, 1, undefined, p as never);
  expect(useStore.getState().cart?.items[0].key).toBe('pending-7'); // before any answer
  expect(useStore.getState().itemCount).toBe(1);
  await new Promise((r) => setTimeout(r, 0));
  fail(new Error('Out of stock'));
  await expect(adding).rejects.toThrow('Out of stock');
  expect(useStore.getState().cart).toBeNull();
});
