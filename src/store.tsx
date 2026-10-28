import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, setAuthToken } from './api';
import { storage } from './storage';
import type { Account, Cart } from './types';

const AUTH_KEY = 'ksp_auth_token';
const CART_KEY = 'ksp_cart_token';

type Variation = { attribute: string; value: string }[];
type Ctx = {
  ready: boolean;
  user: { name: string; email?: string } | null;
  login: (username: string, password: string) => Promise<void>;
  register: (b: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  account: () => Promise<Account>;
  cart: Cart | null;
  cartToken: string | null;
  itemCount: number;
  busy: boolean;
  addItem: (productId: number, quantity?: number, variation?: Variation) => Promise<void>;
  refresh: () => Promise<void>;
  updateItem: (key: string, quantity: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: (code: string) => Promise<void>;
  setCart: (c: Cart | null) => void;
  clearLocalCart: () => Promise<void>;
};
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Ctx['user']>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartToken, setCartToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Cart changes run one after another, and only the last answer is shown: a slow older reply can't overwrite a newer one.
  const chain = React.useRef<Promise<unknown>>(Promise.resolve());
  const waiting = React.useRef(0);

  // Restore the saved login and cart on launch.
  useEffect(() => {
    (async () => {
      const [auth, ct] = await Promise.all([storage.get(AUTH_KEY).catch(() => null), storage.get(CART_KEY).catch(() => null)]);
      if (auth) {
        setAuthToken(auth);
        try { setUser((await api<{ user: { name: string; email?: string } }>('/api/auth/me?lite=1')).user); }
        catch (e) { if (e instanceof ApiError && e.status === 401) { setAuthToken(null); await storage.del(AUTH_KEY); } } // expired login
      }
      if (ct) {
        setCartToken(ct);
        try { setCart(await api<Cart>('/api/cart', { cartToken: ct })); } catch { /* shown as empty until the next refresh */ }
      }
      setReady(true);
    })();
  }, []);

  const signIn = async (token: string) => {
    setAuthToken(token);
    await storage.set(AUTH_KEY, token);
    setUser((await api<{ user: { name: string; email?: string } }>('/api/auth/me?lite=1')).user);
  };
  const login: Ctx['login'] = async (username, password) => signIn((await api<{ token: string }>('/api/auth/login', { method: 'POST', body: { username, password } })).token);
  const register: Ctx['register'] = async (b) => {
    const d = await api<{ token?: string }>('/api/auth/register', { method: 'POST', body: b });
    if (d.token) await signIn(d.token); else await login(b.email, b.password);
  };
  const logout = async () => { setAuthToken(null); setUser(null); await storage.del(AUTH_KEY); };
  const account = () => api<Account>('/api/auth/me');

  const saveCartToken = async (t: string | null | undefined) => {
    if (t && t !== cartToken) { setCartToken(t); await storage.set(CART_KEY, t); }
  };
  const run = useCallback(async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } }, []);

  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    waiting.current += 1;
    const run = chain.current.catch(() => {}).then(fn).finally(() => { waiting.current -= 1; });
    chain.current = run;
    return run;
  };
  const withToken = (path: string, method: string, body: object) => () => enqueue(async () => {
    if (!cartToken) return;
    const next = await api<Cart>(path, { method, body: { ...body, token: cartToken } });
    if (waiting.current <= 1) setCart(next); // a newer change is queued: its answer will be the one to show
  });
  const refresh = useCallback(async () => {
    if (!cartToken || waiting.current > 0) return;
    try { setCart(await api<Cart>('/api/cart', { cartToken })); } catch { /* keep what is shown */ }
  }, [cartToken]);
  const addItem: Ctx['addItem'] = (productId, quantity = 1, variation) => run(() => enqueue(async () => {
    const d = await api<{ cart: Cart; token?: string }>('/api/cart/add', { method: 'POST', body: { productId, quantity, token: cartToken, variation } });
    await saveCartToken(d.token);
    if (waiting.current <= 1) setCart(d.cart);
  }));
  // Quantity changes show instantly; the server's cart replaces the guess when it answers (or the old cart returns on error).
  const optimistic = async (edit: (c: Cart) => Cart, call: () => Promise<void>) => {
    const before = cart;
    if (before) setCart(edit(before));
    try { await call(); } catch (e) {
      // A timeout doesn't mean the change failed: ask the store what the cart is now instead of guessing it back.
      if (e instanceof ApiError && e.status === 0 && cartToken) {
        try { setCart(await api<Cart>('/api/cart', { cartToken })); return; } catch { /* fall through to the old cart */ }
      }
      setCart(before); throw e;
    }
  };
  const updateItem: Ctx['updateItem'] = (key, quantity) => optimistic(
    (c) => ({ ...c, items: c.items.map((i) => (i.key === key ? { ...i, quantity } : i)) }), withToken('/api/cart/update', 'POST', { key, quantity }));
  const removeItem: Ctx['removeItem'] = (key) => optimistic(
    (c) => ({ ...c, items: c.items.filter((i) => i.key !== key) }), withToken('/api/cart/remove', 'POST', { key }));
  const applyCoupon: Ctx['applyCoupon'] = (code) => run(withToken('/api/cart/coupon', 'POST', { code }));
  const removeCoupon: Ctx['removeCoupon'] = (code) => run(withToken('/api/cart/coupon', 'DELETE', { code }));
  const clearLocalCart = async () => { setCart(null); setCartToken(null); await storage.del(CART_KEY); };

  const itemCount = cart?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
  const value = useMemo<Ctx>(() => ({ ready, user, login, register, logout, account, cart, cartToken, itemCount, busy, addItem, refresh, updateItem, removeItem, applyCoupon, removeCoupon, setCart, clearLocalCart }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, user, cart, cartToken, busy, refresh]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
