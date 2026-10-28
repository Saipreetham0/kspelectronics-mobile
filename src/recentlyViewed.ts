import { storage } from './storage';

// The last products opened, newest first: just their ids (a few hundred bytes, well inside the keychain's 2KB limit). The Home screen turns them into cards.
const KEY = 'ksp_recent_products', MAX = 12;
export async function getViewed(): Promise<number[]> {
  try { const v = JSON.parse((await storage.get(KEY)) ?? '[]'); return Array.isArray(v) ? v.filter((n) => Number.isInteger(n)).slice(0, MAX) : []; } catch { return []; }
}
export async function addViewed(id: number) {
  const next = [id, ...(await getViewed()).filter((x) => x !== id)].slice(0, MAX);
  await storage.set(KEY, JSON.stringify(next)).catch(() => {});
}
