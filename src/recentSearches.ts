import { storage } from './storage';

const KEY = 'ksp_recent_searches';
const MAX = 6; // ponytail: SecureStore values cap near 2KB on iOS; 6 short terms stays well under

export async function getRecent(): Promise<string[]> {
  try { return JSON.parse((await storage.get(KEY)) ?? '[]'); } catch { return []; }
}

// Newest first, case-insensitive de-dupe, returns the saved list.
export async function addRecent(term: string): Promise<string[]> {
  const t = term.trim().slice(0, 40);
  if (!t) return getRecent();
  const next = [t, ...(await getRecent()).filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX);
  await storage.set(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export const clearRecent = () => storage.del(KEY).catch(() => {});
