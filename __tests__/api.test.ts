import { api, setAuthToken } from '../src/api';

// Public catalogue reads must not carry the login (it makes the CDN skip its cache); account calls must.
test('Authorization is sent on account calls only', async () => {
  const seen: Record<string, boolean> = {};
  globalThis.fetch = jest.fn(async (url: string, init: RequestInit) => {
    seen[new URL(url).pathname] = 'Authorization' in (init.headers as Record<string, string>);
    return { ok: true, status: 200, json: async () => ({}) } as Response;
  }) as unknown as typeof fetch;
  setAuthToken('t');
  await api('/api/catalog/products?per_page=8');
  await api('/api/catalog/categories');
  await api('/api/app-config');
  await api('/api/orders/12');
  await api('/api/auth/me');
  await api('/api/catalog/products', { method: 'POST', body: {} }); // a write still carries it
  setAuthToken(null);
  expect(seen['/api/catalog/categories']).toBe(false);
  expect(seen['/api/app-config']).toBe(false);
  expect(seen['/api/orders/12']).toBe(true);
  expect(seen['/api/auth/me']).toBe(true);
});
