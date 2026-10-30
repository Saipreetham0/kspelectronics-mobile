import * as StoreReview from 'expo-store-review';
import { storage } from './storage';

// The Play Store / App Store rating prompt, asked only after a happy moment (a review of 4 or 5 stars) and at most once in 90 days.
// The system itself also limits how often it really shows.
const KEY = 'ksp_review_asked';
export async function maybeAskStoreReview() {
  try {
    const last = Number((await storage.get(KEY)) ?? 0) || 0;
    if (Date.now() - last < 90 * 24 * 3600 * 1000 || !(await StoreReview.hasAction())) return;
    await storage.set(KEY, String(Date.now()));
    await StoreReview.requestReview();
  } catch { /* never in the way */ }
}
