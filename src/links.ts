import { Linking } from 'react-native';

// Links that come from the store's replies (tracking pages, payment pages) open only when they are https: anything else (a tel:, sms: or app scheme) is ignored.
export const isHttps = (u?: string | null): u is string => /^https:\/\//i.test((u ?? '').trim());
export const openHttps = (u?: string | null) => (isHttps(u) ? Linking.openURL(u.trim()).catch(() => {}) : Promise.resolve());
