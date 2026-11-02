import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { focusManager, keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query';
import { api, ApiError } from './api';

const RETRY_MS = [5000, 10000, 20000]; // a store hiccup (WordPress slow, a 502) usually clears within a minute

// One cache for every GET in the app: the same path asked for by two screens is fetched once, and coming back to a screen shows what it had at once.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // catalogue data: a minute old is fine; it refreshes in the background after that
      // Only a failure that may be temporary (server error, no connection) is retried; `error` shows once those are used up.
      retry: (n, e) => e instanceof ApiError && (e.status === 0 || e.status >= 500) && n < RETRY_MS.length,
      retryDelay: (n) => RETRY_MS[n] ?? RETRY_MS[RETRY_MS.length - 1],
    },
  },
});
// Coming back to the app counts as "focus": stale screens refresh themselves.
if (Platform.OS !== 'web') AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));

// Fast launch: the catalogue a shopper last saw is kept on the phone, so Home opens with products at once and refreshes behind them.
// Only public catalogue answers are kept (never the account, orders or cart), for at most a day, and a new app version starts clean.
export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createAsyncStoragePersister({ storage: AsyncStorage, key: 'ksp_query_cache', throttleTime: 2000 }),
  maxAge: 24 * 60 * 60 * 1000,
  buster: Constants.expoConfig?.version ?? '',
  dehydrateOptions: {
    shouldDehydrateQuery: (q) => q.state.status === 'success' && typeof q.queryKey[0] === 'string' && /^\/api\/(catalog|offers|app-config)/.test(q.queryKey[0]),
  },
};

// GET with loading / error / reload, cached by path. A null path asks for nothing. While a new path loads, the previous answer stays on screen.
export function useFetch<T>(path: string | null) {
  const q = useQuery({ queryKey: [path], queryFn: () => api<T>(path!), enabled: Boolean(path), placeholderData: keepPreviousData });
  return {
    data: (q.data ?? null) as T | null,
    error: q.error ? q.error.message : '',
    loading: q.isFetching || (Boolean(path) && q.isPending), // pending covers the moment the saved cache is being read back; screens check `loading && !data`, so a background refresh never hides what is shown
    reload: async () => { await q.refetch(); },
  };
}
