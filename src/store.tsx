import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, setAuthToken } from './api';
import { storage } from './storage';
import { clearAddresses } from './addresses';
import { clearLoc, getLoc } from './location';
import type { Account, Cart } from './types';
import { rework } from './cartMath';
import { track } from './analytics';

const AUTH_KEY = 'ksp_auth_token';
const CART_KEY = 'ksp_cart_token';
const GUEST_KEY = 'ksp_guest'; // the shopper chose "continue without an account": the login screen isn't shown again until they log out or ask for it
const USER_KEY = 'ksp_user'; // the signed-in shopper's name and email, kept so an offline launch still knows who they are

type Variation = { attribute: string; value: string }[];
type Ctx = {
  ready: boolean;
  user: { name: string; email?: string } | null;
  guest: boolean; // skipped the login screen
  skipLogin: () => void;
  requestOtp: (phone: string) => Promise<number>; // sends a code by SMS; resolves with the seconds to wait before asking again
  loginOtp: (phone: string, code: string) => Promise<void>;
  showLogin: () => void; // back to the login screen (from a guest's "Log in" buttons)
  login: (username: string, password: string) => Promise<void>;
  register: (b: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  account: () => Promise<Account>;
  cart: Cart | null;
  cartToken: string | null;
  itemCount: number;
  busy: boolean;
  syncing: boolean; // cart changes are still on their way to the store
  addItem: (productId: number, quantity?: number, variation?: Variation) => Promise<void>;
  refresh: () => Promise<void>;
  updateItem: (key: string, quantity: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: (code: string) => Promise<void>;
  quoteShipping: (state: string, postcode: string, city: string, pin?: { lat?: number; lng?: number }) => Promise<void>;
  setCart: (c: Cart | null) => void;
  clearLocalCart: () => Promise<void>;
};
const StoreCtx = createContext<Ctx | null>(null);

// The saved pinned point as the x-pin header (see api.ts), or nothing when no point is pinned.
const pinHeader = async () => { const l = await getLoc().catch(() => null); return l?.lat != null && l.lng != null ? `${l.lat},${l.lng},${l.pin}` : null; };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Ctx['user']>(null);
  const [guest, setGuest] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartToken, setCartToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // Cart changes run one after another, and only the last answer is shown: a slow older reply can't overwrite a newer one.
  const chain = React.useRef<Promise<unknown>>(Promise.resolve());
  const waiting = React.useRef(0);

  // Restore the saved login and cart on launch, side by side (one slow answer no longer holds up the other).
  // Offline at launch (or the store down) keeps you signed in with the name saved last time; only an expired login (401) signs you out.
  useEffect(() => {
    (async () => {
      const [auth, ct, g] = await Promise.all([storage.get(AUTH_KEY).catch(() => null), storage.get(CART_KEY).catch(() => null), storage.get(GUEST_KEY).catch(() => null)]);
      if (g) setGuest(true);
      const restoreUser = async () => {
        if (!auth) return;
        setAuthToken(auth);
        try { const u = (await api<{ user: { name: string; email?: string } }>('/api/auth/me?lite=1')).user; setUser(u); storage.set(USER_KEY, JSON.stringify(u)).catch(() => {}); }
        catch (e) {
          if (e instanceof ApiError && e.status === 401) { setAuthToken(null); await storage.del(AUTH_KEY); await storage.del(USER_KEY).catch(() => {}); return; } // expired login
          try { const v = await storage.get(USER_KEY); if (v) setUser(JSON.parse(v)); } catch { /* no saved name: shown the login screen */ }
        }
      };
      const restoreCart = async () => {
        if (!ct) return;
        setCartToken(ct);
        try { setCart(await api<Cart>('/api/cart', { cartToken: ct, pin: await pinHeader() })); } catch { /* shown as empty until the next refresh */ }
      };
      await Promise.all([restoreUser(), restoreCart()]);
      setReady(true);
    })();
  }, []);

  const signIn = async (token: string) => {
    setAuthToken(token);
    await storage.set(AUTH_KEY, token);
    const u = (await api<{ user: { name: string; email?: string } }>('/api/auth/me?lite=1')).user;
    setUser(u); storage.set(USER_KEY, JSON.stringify(u)).catch(() => {});
  };
  const login: Ctx['login'] = async (username, password) => {
    await signIn((await api<{ token: string }>('/api/auth/login', { method: 'POST', body: { username, password } })).token);
    track('login');
  };
  const register: Ctx['register'] = async (b) => {
    const d = await api<{ token?: string }>('/api/auth/register', { method: 'POST', body: b });
    if (d.token) await signIn(d.token); else await login(b.email, b.password);
    track('register');
  };
  // Sign in with a mobile number and the 6-digit code sent to it (POST /api/auth/otp/request and /verify, see docs/SERVER_API.md).
  const requestOtp: Ctx['requestOtp'] = async (phone) => (await api<{ retryAfter?: number }>('/api/auth/otp/request', { method: 'POST', body: { phone } })).retryAfter ?? 30;
  const loginOtp: Ctx['loginOtp'] = async (phone, code) => {
    await signIn((await api<{ token: string }>('/api/auth/otp/verify', { method: 'POST', body: { phone, code } })).token);
    track('login');
  };
  const skipLogin = () => { track('skip_login'); setGuest(true); storage.set(GUEST_KEY, '1').catch(() => {}); };
  const showLogin = () => { setGuest(false); storage.del(GUEST_KEY).catch(() => {}); };
  const logout = async () => { setAuthToken(null); setUser(null); setGuest(false); await Promise.all([storage.del(AUTH_KEY), storage.del(GUEST_KEY).catch(() => {}), storage.del(USER_KEY).catch(() => {}), clearAddresses(), clearLoc(), ...['ksp_recent_searches', 'ksp_recent_products', 'ksp_wishlist', 'ksp_messages', 'ksp_cart_prices'].map((k) => storage.del(k).catch(() => {}))]); };
  const account = () => api<Account>('/api/auth/me');

  const saveCartToken = async (t: string | null | undefined) => {
    if (t && t !== cartToken) { setCartToken(t); await storage.set(CART_KEY, t); }
  };
  const run = useCallback(async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } }, []);

  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    waiting.current += 1; setSyncing(true);
    const run = chain.current.catch(() => {}).then(fn).finally(() => { waiting.current -= 1; if (waiting.current === 0) setSyncing(false); });
    chain.current = run;
    return run;
  };
  // retry: the call is safe to repeat, so a dead main address doesn't strand it (see api.ts).
  const withToken = (path: string, method: string, body: object, retry = false) => () => enqueue(async () => {
    if (!cartToken) throw new ApiError('Your cart expired. Pull down to refresh it.', 400); // silently doing nothing looked like a button that doesn't work
    const next = await api<Cart>(path, { method, body: { ...body, token: cartToken }, retry });
    if (waiting.current <= 1) setCart(next); // a newer change is queued: its answer will be the one to show
  });
  const refresh = useCallback(async () => {
    if (!cartToken || waiting.current > 0) return;
    try { setCart(await api<Cart>('/api/cart', { cartToken, pin: await pinHeader() })); } catch { /* keep what is shown */ }
  }, [cartToken]);
  const addItem: Ctx['addItem'] = (productId, quantity = 1, variation) => run(() => enqueue(async () => {
    const d = await api<{ cart: Cart; token?: string }>('/api/cart/add', { method: 'POST', body: { productId, quantity, token: cartToken, variation } });
    track('add_to_cart', { quantity });
    await saveCartToken(d.token);
    if (waiting.current <= 1) setCart(d.cart);
  }));
  // Quantity changes show instantly, with the line and the totals re-worked locally; the server's cart replaces the estimate when it answers.
  // If the call fails, the cart is asked for again (rather than guessing the old one back): a timeout, or a remove of a line that is already gone, may well have worked.
  const optimistic = async (edit: (c: Cart) => Cart, call: () => Promise<void>, gone = false) => {
    const before = cart;
    if (before) setCart(edit(before));
    try { await call(); } catch (e) {
      const truth = cartToken ? await api<Cart>('/api/cart', { cartToken, pin: await pinHeader() }).catch(() => null) : null;
      setCart(truth ?? before);
      const unsure = e instanceof ApiError && (e.status === 0 || (gone && e.status === 400));
      if (!(unsure && truth)) throw e;
    }
  };
  const updateItem: Ctx['updateItem'] = (key, quantity) => optimistic(
    (c) => rework(c, key, quantity), withToken('/api/cart/update', 'POST', { key, quantity }, true));
  const removeItem: Ctx['removeItem'] = (key) => optimistic(
    (c) => rework(c, key, 0), withToken('/api/cart/remove', 'POST', { key }, true), true);
  const quoteShipping: Ctx['quoteShipping'] = (state, postcode, city, pin) => withToken('/api/cart/shipping', 'POST', { state, postcode, city, lat: pin?.lat, lng: pin?.lng })();
  const applyCoupon: Ctx['applyCoupon'] = (code) => run(withToken('/api/cart/coupon', 'POST', { code }));
  const removeCoupon: Ctx['removeCoupon'] = (code) => run(withToken('/api/cart/coupon', 'DELETE', { code }));
  const clearLocalCart = async () => { setCart(null); setCartToken(null); await storage.del(CART_KEY); };

  const itemCount = cart?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
  const value = useMemo<Ctx>(() => ({ ready, user, guest, skipLogin, showLogin, requestOtp, loginOtp, login, register, logout, account, cart, cartToken, itemCount, busy, syncing, addItem, refresh, updateItem, removeItem, applyCoupon, removeCoupon, quoteShipping, setCart, clearLocalCart }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, user, guest, cart, cartToken, busy, syncing, refresh]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
