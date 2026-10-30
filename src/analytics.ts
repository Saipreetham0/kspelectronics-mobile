import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from './storage';

// Product analytics (screens and the shopping funnel) sent to PostHog's capture API once EXPO_PUBLIC_POSTHOG_KEY is set; without it every call is a no-op.
// Events carry an anonymous per-install id and never an email, name, phone, address or order contents. Plain fetch: no SDK to ship.
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = (process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');
const ID_KEY = 'ksp_aid';
let id: Promise<string> | null = null;
const anonId = () => (id ??= (async () => {
  try { const v = await storage.get(ID_KEY); if (v) return v; } catch { /* make a new one */ }
  const n = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  storage.set(ID_KEY, n).catch(() => {});
  return n;
})());

export type Event = 'screen' | 'search' | 'add_to_cart' | 'begin_checkout' | 'purchase' | 'login' | 'register' | 'skip_login' | 'location_set';
export async function track(event: Event, props: Record<string, string | number | boolean> = {}) {
  if (!KEY || __DEV__) return;
  try {
    await fetch(`${HOST}/capture/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: KEY, event, distinct_id: await anonId(), properties: { ...props, platform: Platform.OS, app_version: Constants.expoConfig?.version ?? '' } }),
    });
  } catch { /* analytics must never get in the way */ }
}
