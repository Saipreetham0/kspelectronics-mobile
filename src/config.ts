const clean = (u?: string) => (u ?? '').trim().replace(/\/$/, '');
// The main API address first, then an optional backup (EXPO_PUBLIC_API_URL_BACKUP) the app falls back to when the main one can't be reached.
// In development, falls back to local dev server if no EXPO_PUBLIC_API_URL is provided.
// In release builds, defaults to the production store endpoint.
const PROD_DEFAULT_API = 'https://store.kspelectronics.in';
const MAIN = clean(process.env.EXPO_PUBLIC_API_URL) || (__DEV__ ? 'http://localhost:3000' : PROD_DEFAULT_API);
const BACKUP = clean(process.env.EXPO_PUBLIC_API_URL_BACKUP);
if (!__DEV__ && !/^https:\/\//.test(MAIN)) console.error('EXPO_PUBLIC_API_URL must be an https:// address in a release build.');
export const API_URLS = [MAIN, BACKUP].filter((u, i, a) => u && (__DEV__ || /^https:\/\//.test(u)) && a.indexOf(u) === i);
export const SITE_URL = 'https://kspelectronics.in'; // public storefront, used for share links
export const WHATSAPP = '919550421866';
export const LOGO = 'https://cdn.kspelectronics.in/wp-content/uploads/2026/09/29190939/KSP-Electronics-01.svg';
