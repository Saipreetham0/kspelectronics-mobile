import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { storage } from './storage';
import { useStore } from './store';

const KEY = 'ksp_wishlist';
const MAX = 150; // ponytail: SecureStore values cap near 2KB on iOS; 150 ids stays under it. Move to AsyncStorage or the account if people save more.

type Ctx = { ids: number[]; has: (id: number) => boolean; toggle: (id: number) => void };
const WishCtx = createContext<Ctx | null>(null);

// Device-local wishlist of product ids (guests included); products are fetched by id when the list is opened.
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);
  const { user } = useStore();
  const wasIn = useRef(false);
  useEffect(() => { if (user) wasIn.current = true; else if (wasIn.current) { wasIn.current = false; setIds([]); } }, [user]); // logging out empties the list (storage is cleared by logout)
  useEffect(() => { storage.get(KEY).then((v) => v && setIds(JSON.parse(v))).catch(() => {}); }, []);
  const toggle = useCallback((id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIds((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur].slice(0, MAX);
      storage.set(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);
  const value = useMemo(() => ({ ids, has: (id: number) => ids.includes(id), toggle }), [ids, toggle]);
  return <WishCtx.Provider value={value}>{children}</WishCtx.Provider>;
}

export function useWishlist() {
  const v = useContext(WishCtx);
  if (!v) throw new Error('useWishlist outside WishlistProvider');
  return v;
}
