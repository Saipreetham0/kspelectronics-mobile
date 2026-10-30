// Hand-off between the checkout and payment screens (kept out of the URL: it holds the payment order details).
// Persisted to the OS keychain so that if the JS runtime is purged while the app is backgrounded during payment,
// the pay screen can restore the request on mount instead of showing "Nothing to pay."
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type PayRequest = { orderId: number; orderKey: string; rzpOrderId: string; amount: number; currency: string; keyId: string; prefill: { name: string; email: string; contact: string } };

const KEY = 'ksp_pay_request';

// In-memory fast path: avoids an async read when the app is never backgrounded mid-payment (the common case).
let current: PayRequest | null = null;

const store = {
  save: async (p: PayRequest) => {
    if (Platform.OS === 'web') { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ } return; }
    await SecureStore.setItemAsync(KEY, JSON.stringify(p)).catch(() => {});
  },
  load: async (): Promise<PayRequest | null> => {
    try {
      const raw = Platform.OS === 'web' ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
      return raw ? (JSON.parse(raw) as PayRequest) : null;
    } catch { return null; }
  },
  clear: async () => {
    if (Platform.OS === 'web') { try { localStorage.removeItem(KEY); } catch { /* ignore */ } return; }
    await SecureStore.deleteItemAsync(KEY).catch(() => {});
  },
};

export const setPayRequest = async (p: PayRequest | null): Promise<void> => {
  current = p;
  if (p) await store.save(p); else await store.clear();
};

// Returns the in-memory value instantly; if it is null (runtime was purged), falls back to reading from the keychain.
export const getPayRequest = (): PayRequest | null => current;
export const restorePayRequest = async (): Promise<PayRequest | null> => {
  if (current) return current;
  const saved = await store.load();
  current = saved;
  return saved;
};
