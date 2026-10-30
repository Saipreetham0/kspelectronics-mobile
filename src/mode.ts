import { useEffect, useSyncExternalStore } from 'react';
import { api } from './api';
import { storage } from './storage';
import { useLoc, type Loc } from './location';

// Quick (a rider brings it, from products tagged "quick") or All products (normal shipping). Shared by every screen, remembered on the phone.
export type Mode = 'quick' | 'all';
const KEY = 'ksp_mode';
export const QUICK_TAG = 'quick';

type S = { chosen: Mode | null; where: string; ok: boolean | null; has: boolean | null }; // ok: can a rider reach `where`? has: is any product tagged for Quick? null = asking
let s: S = { chosen: null, where: '', ok: null, has: null };
const subs = new Set<() => void>();
const set = (p: Partial<S>) => { s = { ...s, ...p }; subs.forEach((f) => f()); };
let loaded = false;
const load = () => {
  if (loaded) return; loaded = true;
  // Quick with nothing tagged "quick" would open on an empty Home, so it stays off until at least one product carries the tag.
  api<unknown[]>(`/api/catalog/products?tag=${QUICK_TAG}&per_page=1&lean=1`).then((r) => set({ has: Array.isArray(r) && r.length > 0 })).catch(() => set({ has: false }));
  storage.get(KEY).then((v) => { if (v === 'quick' || v === 'all') set({ chosen: v }); }).catch(() => {}); };

export function setMode(m: Mode) { set({ chosen: m }); storage.set(KEY, m).catch(() => {}); }

// Is a rider available to the saved pin? Asked again only when the pin changes, and "no" (or no answer) just means normal shipping.
const asked = new Map<string, boolean>();
function check(loc: Loc | null | undefined) {
  if (!loc || loc.lat == null || loc.lng == null) { if (s.where !== '' || s.ok !== false) set({ where: '', ok: false }); return; }
  const where = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)},${loc.pin}`;
  if (where === s.where) return;
  const known = asked.get(where);
  if (known != null) { set({ where, ok: known }); return; }
  set({ where, ok: null });
  api<{ available: boolean }>(`/api/shiprocket/quote?lat=${loc.lat}&lng=${loc.lng}&pincode=${loc.pin}`)
    .then((r) => { asked.set(where, r.available); if (s.where === where) set({ ok: r.available }); })
    .catch(() => { if (s.where === where) set({ ok: false }); });
}

// quickOk: a rider can deliver here. mode: what to show: Quick only when it is available, and by default whenever it is.
export function useMode() {
  const loc = useLoc();
  useEffect(() => { load(); }, []);
  useEffect(() => { if (loc !== undefined) check(loc); }, [loc]);
  const v = useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => s);
  const quickOk = v.ok === true && v.has === true;
  const noQuickItems = v.ok === true && v.has === false; // a rider could come, but nothing is tagged for it yet
  const mode: Mode = quickOk && (v.chosen ?? 'quick') === 'quick' ? 'quick' : 'all';
  return { mode, quickOk, checking: (v.ok === null && Boolean(loc?.lat != null)) || (v.ok === true && v.has === null), noQuickItems, setMode };
}
