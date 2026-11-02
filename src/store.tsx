import React, { useEffect } from 'react';
import { create } from 'zustand';
import { api, ApiError, setAuthToken, setExpiredHandler } from './api';
import { setPayRequest } from './payRequest';
import { storage } from './storage';
import { clearAddresses } from './addresses';
import { clearLoc, getLoc } from './location';
import type { Account, Cart, Product } from './types';
import { rework } from './cartMath';
import { track } from './analytics';
import { queryClient } from './useFetch';

const AUTH_KEY = 'ksp_auth_token';
const CART_KEY = 'ksp_cart_token';
const GUEST_KEY = 'ksp_guest'; // the shopper chose "continue without an account": the login screen isn't shown again until they log out or ask for it
const USER_KEY = 'ksp_user'; // the signed-in shopper's name and email, kept so an offline launch still knows who they are
const ONBOARDED_KEY = 'ksp_onboarded'; // the shopper has seen or skipped the first-install onboarding carousel

type Variation = { attribute: string; value: string }[];
type User = { name: string; email?: string };
type Store = {
  ready: boolean;
  onboarded: boolean;
  completeOnboarding: () => void;
  user: User | null;
  guest: boolean; // skipped the login screen
  skipLogin: () => void;
  requestOtp: (phone: string) => Promise<number>; // sends a code by SMS; resolves with the seconds to wait before asking again
  loginOtp: (phone: string, code: string) => Promise<void>;
  showLogin: () => void; // back to the login screen (from a guest's "Log in" buttons)
  login: (username: string, password: string) => Promise<void>;
  register: (b: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  account: (fresh?: boolean) => Promise<Account>; // shared by every screen (one request, cached 30 s); fresh skips the cache (pull to refresh)
  cart: Cart | null;
  cartToken: string | null;
  cartFailed: boolean; // a cart is saved but the store couldn't be asked for it: shown as an error with a retry, not as an empty cart
  itemCount: number;
  busy: boolean;
  syncing: boolean; // cart changes are still on their way to the store
  addItem: (productId: number, quantity?: number, variation?: Variation, preview?: Product) => Promise<void>; // preview: the product, so its line shows in the cart at once
  refresh: () => Promise<void>;
  updateItem: (key: string, quantity: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: (code: string) => Promise<void>;
  quoteShipping: (state: string, postcode: string, city: string, pin?: { lat?: number; lng?: number }) => Promise<void>;
  setCart: (c: Cart | null) => void;
  clearLocalCart: () => Promise<void>;
};

// The saved pinned point as the x-pin header (see api.ts), or nothing when no point is pinned.
const pinHeader = async () => { const l = await getLoc().catch(() => null); return l?.lat != null && l.lng != null ? `${l.lat},${l.lng},${l.pin}` : null; };
// A provisional cart line for a product that is on its way to the store (key "pending-…": it can't be changed until the store names it).
export const PENDING = 'pending-';
function withLine(cart: Cart | null, p: Product, quantity: number): Cart {
  const m = p.prices.currency_minor_unit, line = String(Number(p.prices.price) * quantity);
  const item = { key: `${PENDING}${p.id}`, id: p.id, quantity, name: p.name, sku: p.sku, images: p.images, prices: p.prices, totals: { line_total: line, currency_minor_unit: m } };
  const base: Cart = cart ?? { items: [], items_count: 0, coupons: [], totals: { total_items: '0', total_discount: '0', total_shipping: '0', total_tax: '0', total_price: '0', currency_minor_unit: m, currency_symbol: p.prices.currency_symbol } };
  const add = (v: string) => String(Number(v || 0) + Number(line));
  return { ...base, items: [...base.items, item], items_count: base.items_count + quantity, totals: { ...base.totals, total_items: add(base.totals.total_items), total_price: add(base.totals.total_price) } };
}
const count = (c: Cart | null) => c?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;

// Cart changes run one after another, and only the last answer is shown: a slow older reply can't overwrite a newer one.
let chain: Promise<unknown> = Promise.resolve();
let waiting = 0;

// Login, cart and onboarding state, shared by every screen. Components read it with useStore() (or useStore((s) => s.cart) to re-render on that alone).
export const useStore = create<Store>()((set, get) => {
  const setCart = (c: Cart | null) => set({ cart: c, itemCount: count(c) });
  const setUser = (u: User | null) => {
    set({ user: u });
    if (u) storage.set(USER_KEY, JSON.stringify(u)).catch(() => {});
  };
  const signIn = async (token: string) => {
    setAuthToken(token);
    await storage.set(AUTH_KEY, token);
    setUser((await api<{ user: User }>('/api/auth/me?lite=1')).user);
  };
  const saveCartToken = async (t: string | null | undefined) => {
    if (t && t !== get().cartToken) { set({ cartToken: t }); await storage.set(CART_KEY, t); }
  };
  const run = async (fn: () => Promise<void>) => { set({ busy: true }); try { await fn(); } finally { set({ busy: false }); } };
  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    waiting += 1; set({ syncing: true });
    const next = chain.catch(() => {}).then(fn).finally(() => { waiting -= 1; if (waiting === 0) set({ syncing: false }); });
    chain = next;
    return next;
  };
  // retry: the call is safe to repeat, so a dead main address doesn't strand it (see api.ts).
  const withToken = (path: string, method: string, body: object, retry = false) => () => enqueue(async () => {
    let token = get().cartToken;
    if (!token) {
      token = await storage.get(CART_KEY).catch(() => null);
      if (token) set({ cartToken: token });
    }
    if (!token) throw new ApiError('Your cart expired. Pull down to refresh it.', 400); // silently doing nothing looked like a button that doesn't work
    const next = await api<Cart>(path, { method, body: { ...body, token }, cartToken: token, retry });
    if (waiting <= 1) setCart(next); // a newer change is queued: its answer will be the one to show
  });
  // Quantity changes show instantly, with the line and the totals re-worked locally; the server's cart replaces the estimate when it answers.
  // If the call fails, the cart is asked for again (rather than guessing the old one back): a timeout, or a remove of a line that is already gone, may well have worked.
  const optimistic = async (edit: (c: Cart) => Cart, call: () => Promise<void>, gone = false) => {
    const before = get().cart;
    if (before) setCart(edit(before));
    try {
      await call();
    } catch (e) {
      const token = get().cartToken;
      const truth = token ? await api<Cart>('/api/cart', { cartToken: token, pin: await pinHeader() }).catch(() => null) : null;
      setCart(truth ?? before);
      const unsure = e instanceof ApiError && (e.status === 0 || (gone && e.status === 400));
      if (!(unsure && truth)) throw e;
    }
  };
  const login: Store['login'] = async (username, password) => {
    await signIn((await api<{ token: string }>('/api/auth/login', { method: 'POST', body: { username, password } })).token);
    track('login');
  };

  return {
    ready: false, onboarded: false, user: null, guest: false,
    cart: null, cartToken: null, cartFailed: false, itemCount: 0, busy: false, syncing: false,
    setCart,
    completeOnboarding: () => { set({ onboarded: true }); storage.set(ONBOARDED_KEY, '1').catch(() => {}); },
    skipLogin: () => { track('skip_login'); set({ guest: true }); storage.set(GUEST_KEY, '1').catch(() => {}); },
    showLogin: () => { set({ guest: false }); storage.del(GUEST_KEY).catch(() => {}); },
    login,
    register: async (b) => {
      const d = await api<{ token?: string }>('/api/auth/register', { method: 'POST', body: b });
      if (d.token) await signIn(d.token); else await login(b.email, b.password);
      track('register');
    },
    // Sign in with a mobile number and the 6-digit code sent to it (POST /api/auth/otp/request and /verify, see docs/SERVER_API.md).
    requestOtp: async (phone) => (await api<{ retryAfter?: number }>('/api/auth/otp/request', { method: 'POST', body: { phone } })).retryAfter ?? 30,
    loginOtp: async (phone, code) => {
      await signIn((await api<{ token: string }>('/api/auth/otp/verify', { method: 'POST', body: { phone, code } })).token);
      track('login');
    },
    logout: async () => {
      track('logout');
      setAuthToken(null);
      set({ user: null, guest: false, cartToken: null });
      setCart(null);
      queryClient.clear(); // nothing fetched for this shopper is shown to the next one
      await Promise.all([
        storage.del(AUTH_KEY),
        storage.del(CART_KEY).catch(() => {}),
        storage.del(GUEST_KEY).catch(() => {}),
        storage.del(USER_KEY).catch(() => {}),
        clearAddresses(),
        clearLoc(),
        setPayRequest(null), // an unfinished payment's order key must not outlive the login
        ...['ksp_recent_searches', 'ksp_recent_products', 'ksp_wishlist', 'ksp_messages', 'ksp_cart_prices', 'ksp_pending_order', 'ksp_contact'].map((k) => storage.del(k).catch(() => {}))
      ]);
    },
    account: (fresh = false) => queryClient.fetchQuery({ queryKey: ['/api/auth/me'], queryFn: () => api<Account>('/api/auth/me'), staleTime: fresh ? 0 : 30_000 }),
    refresh: async () => {
      const token = get().cartToken;
      if (!token || waiting > 0) return;
      try {
        setCart(await api<Cart>('/api/cart', { cartToken: token, pin: await pinHeader() }));
        set({ cartFailed: false });
      } catch (e) {
        const expired = e instanceof ApiError && e.status === 400;
        set({ cartFailed: !expired });
        if (expired) { set({ cartToken: null }); setCart(null); await storage.del(CART_KEY).catch(() => {}); }
      }
    },
    // With a preview (a simple product from a card) the line appears in the same frame, Blinkit-style; the store's cart replaces it when it answers.
    addItem: (productId, quantity = 1, variation, preview) => run(async () => {
      const before = get().cart;
      if (preview && !variation && !before?.items.some((i) => i.id === productId)) setCart(withLine(before, preview, quantity));
      try {
        await enqueue(async () => {
          const token = get().cartToken;
          const d = await api<{ cart: Cart; token?: string }>('/api/cart/add', { method: 'POST', body: { productId, quantity, token, variation }, cartToken: token });
          track('add_to_cart', { quantity });
          await saveCartToken(d.token);
          if (waiting <= 1) setCart(d.cart);
        });
      } catch (e) {
        if (preview) setCart(before); // nothing was added: take the line back out
        throw e;
      }
    }),
    updateItem: (key, quantity) => optimistic((c) => rework(c, key, quantity), withToken('/api/cart/update', 'POST', { key, quantity }, true)),
    removeItem: (key) => {
      track('remove_from_cart', { key });
      return optimistic((c) => rework(c, key, 0), withToken('/api/cart/remove', 'POST', { key }, true), true);
    },
    quoteShipping: (state, postcode, city, pin) => withToken('/api/cart/shipping', 'POST', { state, postcode, city, lat: pin?.lat, lng: pin?.lng })(),
    applyCoupon: (code) => { track('apply_coupon', { code }); return run(withToken('/api/cart/coupon', 'POST', { code })); },
    removeCoupon: (code) => run(withToken('/api/cart/coupon', 'DELETE', { code })),
    clearLocalCart: async () => { set({ cartToken: null }); setCart(null); await storage.del(CART_KEY); },
  };
});

// Restore the saved login and cart on launch. The app opens from what is saved on the phone (the signed-in name, the cart's token) and checks both with the
// store in the background: waiting for the network here kept shoppers on the start screen for seconds, or up to 25 s on a bad connection.
// Offline at launch (or the store down) keeps you signed in with the name saved last time; only an expired login (401) signs you out.
async function restore() {
  const set = useStore.setState;
  const [auth, ct, g, savedUser, onb] = await Promise.all([AUTH_KEY, CART_KEY, GUEST_KEY, USER_KEY, ONBOARDED_KEY].map((k) => storage.get(k).catch(() => null)));
  if (g) set({ guest: true });
  if (onb || auth || g) set({ onboarded: true });
  const verifyUser = async () => {
    try { const u = (await api<{ user: User }>('/api/auth/me?lite=1')).user; set({ user: u }); storage.set(USER_KEY, JSON.stringify(u)).catch(() => {}); }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) { setAuthToken(null); set({ user: null }); await storage.del(AUTH_KEY); await storage.del(USER_KEY).catch(() => {}); } // expired login
      // any other failure: keep the saved name
    }
  };
  let shown = false;
  if (auth) { setAuthToken(auth); try { if (savedUser) { set({ user: JSON.parse(savedUser) }); shown = true; } } catch { /* no usable saved name */ } }
  if (auth && !shown) await Promise.race([verifyUser(), new Promise((r) => setTimeout(r, 2000))]); // cap wait so app never hangs offline
  if (ct) set({ cartToken: ct });
  set({ ready: true });
  if (auth && shown) verifyUser();
  if (ct) api<Cart>('/api/cart', { cartToken: ct, pin: await pinHeader() })
    .then((c) => { useStore.getState().setCart(c); set({ cartFailed: false }); })
    .catch(() => set({ cartFailed: true }));
}

// Runs the launch restore once, and signs out here too when the store rejects the saved login mid-session (the cart and addresses stay: the shopper can carry on as a guest).
export function StoreProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { restore(); }, []);
  useEffect(() => {
    setExpiredHandler(() => { setAuthToken(null); useStore.setState({ user: null }); storage.del(AUTH_KEY).catch(() => {}); storage.del(USER_KEY).catch(() => {}); });
    return () => setExpiredHandler(null);
  }, []);
  return <>{children}</>;
}
