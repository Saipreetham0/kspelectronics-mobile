import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Login and cart tokens go in the OS keychain/keystore; the web preview falls back to localStorage.
export const storage = {
  get: async (k: string) => (Platform.OS === 'web' ? localStorage.getItem(k) : SecureStore.getItemAsync(k)),
  set: async (k: string, v: string) => (Platform.OS === 'web' ? localStorage.setItem(k, v) : SecureStore.setItemAsync(k, v)),
  del: async (k: string) => (Platform.OS === 'web' ? localStorage.removeItem(k) : SecureStore.deleteItemAsync(k)),
};
