import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import { track } from './analytics';
import { storage } from './storage';
import { useStore } from './store';

const KEY = 'ksp_wishlist';
const MAX = 150; // ponytail: SecureStore values cap near 2KB on iOS; 150 ids stays under it. Move to AsyncStorage or the account if people save more.

type Wish = { ids: number[]; has: (id: number) => boolean; toggle: (id: number) => void };

// Device-local wishlist of product ids (guests included); products are fetched by id when the list is opened.
export const useWishlist = create<Wish>()((set, get) => ({
  ids: [],
  has: (id) => get().ids.includes(id),
  toggle: (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const cur = get().ids;
    const isAdding = !cur.includes(id);
    track(isAdding ? 'add_to_wishlist' : 'remove_from_wishlist', { id });
    const next = isAdding ? [id, ...cur].slice(0, MAX) : cur.filter((x) => x !== id);
    set({ ids: next });
    storage.set(KEY, JSON.stringify(next)).catch(() => {});
  },
}));
// One card's heart: re-renders only when this product is added or removed, not when any other is.
export const useWished = (id: number) => useWishlist((s) => s.ids.includes(id));

storage.get(KEY).then((v) => { if (v) useWishlist.setState({ ids: JSON.parse(v) }); }).catch(() => {});
// Logging out empties the list (logout clears the saved copy too).
useStore.subscribe((s, prev) => { if (prev.user && !s.user) useWishlist.setState({ ids: [] }); });
