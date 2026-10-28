import { API_URLS } from './config';

let authToken: string | null = null;
export const setAuthToken = (t: string | null) => { authToken = t; };

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

type Opts = { method?: string; body?: unknown; cartToken?: string | null };

let active = 0; // index of the API address that worked last, so a dead main address isn't retried on every call

// One request to one address. Replies are never assumed to be JSON; status 0 means the server could not be reached.
async function call<T>(url: string, { method = 'GET', body, cartToken }: Opts, timeoutMs: number): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method, signal: ctl.signal,
      headers: {
        'Content-Type': 'application/json', 'x-client': 'app',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(cartToken ? { 'x-cart-token': cartToken } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new ApiError((data as { error?: string } | null)?.error ?? 'Something went wrong. Please try again.', r.status);
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError((e as Error).name === 'AbortError' ? 'The request timed out. Check your connection.' : 'Could not reach the store. Check your connection.', 0);
  } finally {
    clearTimeout(timer);
  }
}

// Every call goes to your Next.js API with the shopper's login token. When the main address can't be reached, reads fall back to the backup address.
// Only GETs fall back: after a network failure a POST (checkout, add to cart) may already have reached the server, so repeating it elsewhere could duplicate it.
export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  // Product lists ask for the slim version (about 1 KB a product instead of 16): the list screens need little, and the product page loads its own full copy.
  if (/^\/api\/catalog\/products\?/.test(path) && !/[?&]lean=/.test(path)) path += '&lean=1';
  if (!API_URLS.length) throw new ApiError('This copy of the app is not set up to reach the store. Please update the app.', 0);
  const order = API_URLS.map((_, i) => (i + active) % API_URLS.length);
  const tries = (opts.method ?? 'GET') === 'GET' ? order : order.slice(0, 1);
  // Cart and checkout writes take WordPress 4-12 seconds on a slow moment: cutting them off at 10s made removals look failed (and rolled back) though the store had done them.
  const timeoutMs = tries.length > 1 ? 10000 : 25000;
  let last: ApiError | null = null;
  for (const i of tries) {
    try {
      const data = await call<T>(API_URLS[i] + path, opts, timeoutMs);
      active = i;
      return data;
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 0) throw e; // a real answer from the server (even an error) is final
      last = e;
    }
  }
  throw last as ApiError;
}
