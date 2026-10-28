import { api } from './api';
import { storage } from './storage';

export type Loc = { pin: string; area: string; city: string; state: string; stateCode: string; lat?: number; lng?: number; formatted?: string };

const KEY = 'ksp_location';

// The shopper's delivery location. `ksp_pincode` is kept in step because older screens read it.
export async function getLoc(): Promise<Loc | null> {
  try { const v = await storage.get(KEY); return v ? (JSON.parse(v) as Loc) : null; } catch { return null; }
}
export async function saveLoc(l: Loc) {
  await storage.set(KEY, JSON.stringify(l)).catch(() => {});
  await storage.set('ksp_pincode', l.pin).catch(() => {});
}
export const lookupPin = (pin: string) => api<Loc>(`/api/pincode/${pin}`);

// Same-day delivery is only promised around Hyderabad.
export const isHyderabad = (l: Loc | null) => !!l && /hyderabad|ranga ?reddy|medchal|sangareddy/i.test(l.city);

// The saved pincode with its area and city; looks the place up (and saves it) when only a bare pincode was stored before.
export async function loadLoc(): Promise<{ loc: Loc | null; pin: string }> {
  const loc = await getLoc();
  if (loc) return { loc, pin: loc.pin };
  const pin = (await storage.get('ksp_pincode').catch(() => null)) ?? '';
  if (!/^\d{6}$/.test(pin)) return { loc: null, pin: '' };
  try { const found = await lookupPin(pin); await saveLoc(found); return { loc: found, pin }; } catch { return { loc: null, pin }; }
}
