import { storage } from './storage';
import type { Loc } from './location';

export type Saved = { id: string; label: 'Home' | 'Work' | 'Other'; line: string; name: string; phone: string; loc: Loc };

// Saved delivery addresses live on the phone. The keychain holds about 2KB per entry, so each address has its own key plus a small index.
const INDEX = 'ksp_addr_index', SEL = 'ksp_addr_sel', MAX = 6;
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
  const ids = (await listAddresses()).map((x) => x.id).slice(-(MAX - 1)); // the oldest drops off beyond six
  await storage.set(key(saved.id), JSON.stringify(saved));
  await storage.set(INDEX, JSON.stringify([...ids, saved.id]));
  await selectAddress(saved.id);
  return saved;
}
export async function removeAddress(id: string) {
  const ids = (await listAddresses()).map((x) => x.id).filter((x) => x !== id);
  await storage.set(INDEX, JSON.stringify(ids));
  await storage.del(key(id)).catch(() => {});
  if ((await selectedAddressId()) === id) await selectAddress(null);
}
