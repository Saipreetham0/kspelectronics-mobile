import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Login and cart tokens go in the OS keychain/keystore; the web preview falls back to localStorage.
// localStorage can throw in private browsing mode or when storage is disabled — guard every call.
export const storage = {
  get: async (k: string) => {
    if (Platform.OS === 'web') { try { return localStorage.getItem(k); } catch { return null; } }
    return SecureStore.getItemAsync(k);
  },
  set: async (k: string, v: string) => {
    if (Platform.OS === 'web') { try { localStorage.setItem(k, v); } catch { /* storage disabled or quota exceeded */ } return; }
    return SecureStore.setItemAsync(k, v);
  },
  del: async (k: string) => {
    if (Platform.OS === 'web') { try { localStorage.removeItem(k); } catch { /* ignore */ } return; }
    return SecureStore.deleteItemAsync(k);
  },
};
