import { useEffect, useSyncExternalStore } from 'react';
import { api } from './api';
import { storage } from './storage';

export type Loc = { pin: string; area: string; city: string; state: string; stateCode: string; lat?: number; lng?: number; formatted?: string };

const KEY = 'ksp_location';

// The current location, shared by every screen: changing it anywhere updates Home, product cards and the rest at once. undefined = not read yet.
let current: Loc | null | undefined;
const subs = new Set<() => void>();
let reading: Promise<unknown> | null = null;
const publish = (l: Loc | null) => { current = l; subs.forEach((f) => f()); };
export function useLoc(): Loc | null | undefined {
  useEffect(() => { if (current === undefined && !reading) reading = loadLoc().catch(() => {}).finally(() => { reading = null; }); }, []); // one read, however many product cards ask
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => current);
}

// The shopper's delivery location. `ksp_pincode` is kept in step because older screens read it.
export async function getLoc(): Promise<Loc | null> {
  try { const v = await storage.get(KEY); return v ? (JSON.parse(v) as Loc) : null; } catch { return null; }
}
export async function saveLoc(l: Loc) {
  publish(l);
  await storage.set(KEY, JSON.stringify(l)).catch(() => {});
  await storage.set('ksp_pincode', l.pin).catch(() => {});
}
export const clearLoc = () => { publish(null); return Promise.all([storage.del(KEY), storage.del('ksp_pincode')].map((p) => p.catch(() => {}))); };
export const lookupPin = (pin: string) => api<Loc>(`/api/pincode/${pin}`);

// Same-day delivery is only promised around Hyderabad.
export const isHyderabad = (l: Loc | null) => !!l && /hyderabad|ranga ?reddy|medchal|sangareddy/i.test(l.city);

// The saved pincode with its area and city; looks the place up (and saves it) when only a bare pincode was stored before.
export async function loadLoc(): Promise<{ loc: Loc | null; pin: string }> {
  const loc = await getLoc();
  if (loc) { publish(loc); return { loc, pin: loc.pin }; }
  const pin = (await storage.get('ksp_pincode').catch(() => null)) ?? '';
  if (!/^\d{6}$/.test(pin)) { publish(null); return { loc: null, pin: '' }; }
  try { const found = await lookupPin(pin); await saveLoc(found); return { loc: found, pin }; } catch { publish(null); return { loc: null, pin }; }
}
