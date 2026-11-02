import * as SecureStore from 'expo-secure-store';

// Login and cart tokens go in the OS keychain/keystore.
export const storage = {
  get: (k: string) => SecureStore.getItemAsync(k),
  set: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  del: (k: string) => SecureStore.deleteItemAsync(k),
};
