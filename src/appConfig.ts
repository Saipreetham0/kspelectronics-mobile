import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';
import { storage } from './storage';

// Settings the store can change without an app release, read from GET /api/app-config (see docs/SERVER_API.md):
//   flags       switch features that need the store's help on and off ({ otp, slots, offers, rider_map, ... })
//   minVersion  the oldest app version allowed to run; older ones are asked to update
//   message     a notice shown at the top of the app
//   banners     replace the Home banners
// Without the endpoint (or offline) everything stays at its default: features that need the store stay hidden.
export type RemoteBanner = { id: string; tag?: string; title: string; sub?: string; cta?: string; colors?: [string, string]; fg?: string; category?: string; search?: string };
export type AppConfig = { minVersion?: string; message?: string; flags?: Record<string, boolean>; banners?: RemoteBanner[] };

const KEY = 'ksp_cfg';
let cfg: AppConfig = {};
const subs = new Set<() => void>();
const set = (c: AppConfig) => { cfg = c; subs.forEach((f) => f()); };

export const appVersion = Constants.expoConfig?.version ?? '0.0.0';
// 1.10.0 is newer than 1.9.0: compared number by number.
export const isNewer = (a: string, b: string) => {
  const x = a.split('.').map((n) => parseInt(n, 10) || 0), y = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};
export const updateRequired = (c: AppConfig) => Boolean(c.minVersion) && isNewer(c.minVersion!, appVersion);
export const storeUrl = Platform.OS === 'android' ? 'https://play.google.com/store/apps/details?id=in.kspelectronics.app' : 'https://kspelectronics.in';

// The last answer is kept on the phone (small: flags, version and message only) so a launch without a connection still knows them.
export async function loadAppConfig() {
  try { const v = await storage.get(KEY); if (v) set(JSON.parse(v)); } catch { /* defaults */ }
  try {
    const fresh = await api<AppConfig>('/api/app-config');
    set(fresh);
    storage.set(KEY, JSON.stringify({ minVersion: fresh.minVersion, message: fresh.message, flags: fresh.flags })).catch(() => {});
  } catch { /* no endpoint yet, or offline */ }
}
export const useAppConfig = () => useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => cfg);
export const useFlag = (name: string) => Boolean(useAppConfig().flags?.[name]);
