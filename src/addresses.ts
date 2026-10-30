import { storage } from './storage';
import type { Loc } from './location';

export type Saved = { id: string; label: 'Home' | 'Work' | 'Other'; line: string; name: string; phone: string; loc: Loc };

// Saved delivery addresses live on the phone. The keychain holds about 2KB per entry, so each address has its own key plus a small index.
const INDEX = 'ksp_addr_index', SEL = 'ksp_addr_sel';
export const MAX_ADDRESSES = 6;
const MAX = MAX_ADDRESSES;
const key = (id: string) => `ksp_addr_${id}`;

export async function listAddresses(): Promise<Saved[]> {
  try {
    const ids: string[] = JSON.parse((await storage.get(INDEX)) ?? '[]');
    const rows = await Promise.all(ids.map((id) => storage.get(key(id)).then((v) => (v ? (JSON.parse(v) as Saved) : null)).catch(() => null)));
    return rows.filter((x): x is Saved => Boolean(x));
  } catch { return []; }
}
export const selectedAddressId = () => storage.get(SEL).catch(() => null);
export const selectAddress = (id: string | null) => (id ? storage.set(SEL, id) : storage.del(SEL)).catch(() => {});
export async function selectedAddress(): Promise<Saved | null> {
  const [id, all] = await Promise.all([selectedAddressId(), listAddresses()]);
  return all.find((a) => a.id === id) ?? null;
}

export async function addAddress(a: Omit<Saved, 'id'>): Promise<Saved> {
  const saved: Saved = { ...a, id: Date.now().toString(36) };
  const all = (await listAddresses()).map((x) => x.id);
  const ids = all.slice(-(MAX - 1)); // the oldest drops off beyond six
  await storage.set(key(saved.id), JSON.stringify(saved));
  await storage.set(INDEX, JSON.stringify([...ids, saved.id]));
  await Promise.all(all.filter((x) => !ids.includes(x)).map((x) => storage.del(key(x)).catch(() => {}))); // and its keychain entry goes with it
  await selectAddress(saved.id);
  return saved;
}
// On logout: saved addresses hold names and phone numbers, so the next person on this phone must not inherit them.
export async function clearAddresses() {
  const ids = (await listAddresses()).map((x) => x.id);
  await Promise.all([...ids.map((id) => storage.del(key(id))), storage.del(INDEX), storage.del(SEL)].map((p) => p.catch(() => {})));
}
// Editing keeps the id (and so its place in the list). Which address is selected is left to the caller.
export const updateAddress = (a: Saved) => storage.set(key(a.id), JSON.stringify(a));
export async function removeAddress(id: string) {
  const ids = (await listAddresses()).map((x) => x.id).filter((x) => x !== id);
  await storage.set(INDEX, JSON.stringify(ids));
  await storage.del(key(id)).catch(() => {});
  if ((await selectedAddressId()) === id) await selectAddress(null);
}
