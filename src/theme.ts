// Blinkit-style layout in the KSP brand palette. Every colour and text size in the app comes from here, so a rebrand is a change here only.
// Contrast (WCAG): text tokens are 4.5:1 or more on white; borderStrong is 3:1 (enough for radio and checkbox outlines).
const greenDark = '#15803d';
export const c = {
  // KSP logo colours: blue #1c61e7 and green #21c15e. Blue drives primary actions; green marks savings and success.
  accent: '#1c61e7', accentDark: '#144fc0', accentSoft: '#e8f0ff', accentTint: '#eef3fc', heroTop: '#d6e5ff', // the last two: light blue surfaces and the top of header gradients
  green: '#21c15e', /* icons and fills only: too light for text */ greenDark, greenSoft: '#e6f8ee',
  // Greys, darkest to lightest: text, text2 (secondary text), muted (captions), placeholder, borderStrong (control outlines), line (dividers), surface, bg.
  text: '#1f1f1f', text2: '#444444', muted: '#5f6673', placeholder: '#767676', borderStrong: '#868c96', line: '#ebebeb', surface: '#f4f5f7', bg: '#ffffff',
  disabled: '#b0b5bd', // greyed-out controls only (exempt from contrast rules), never for text that must be read
  // Loading dots, spinners and pull-to-refresh: brand green (3.3:1 on white), so waiting reads as a different state from the blue actions.
  loader: '#16a34a',
  danger: '#c8232f', dangerSoft: '#fdecec', success: greenDark, whatsapp: '#25D366',
  // Deals and urgency: amber fill with dark-brown text (amber text on white is too faint to read).
  deal: '#f59e0b', dealSoft: '#fef3c7', dealText: '#92400e',
};
// Type scale: use these sizes only. Inter is loaded in four weights: 400 body, 600 labels, 700 titles, 800 prices and hero text.
export const fs = { xs: 11, sm: 12, base: 13, md: 15, lg: 17, xl: 20, xxl: 24, hero: 28 };
export const r = { sm: 8, md: 12, lg: 16, pill: 99 };
export const shadow = { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 } as const;
