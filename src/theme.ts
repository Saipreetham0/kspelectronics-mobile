// Blinkit-style layout in the KSP brand palette. `accent` drives every primary button, link and highlight, so a rebrand is a change here only.
export const c = {
  // KSP logo colours: blue #1c61e7 and green #21c15e. Blue drives primary actions; green marks savings and success.
  accent: '#1c61e7', accentDark: '#144fc0', accentSoft: '#e8f0ff', green: '#21c15e', /* icons and fills only: too light for text */ greenDark: '#15803d', greenSoft: '#e6f8ee',
  text: '#1f1f1f', muted: '#5f6673', line: '#ebebeb', bg: '#ffffff', surface: '#f4f5f7',
  // Loading dots, spinners and pull-to-refresh: brand green (3.3:1 on white), so waiting reads as a different state from the blue actions.
  loader: '#16a34a',
  danger: '#d92d3a', success: '#15803d', whatsapp: '#25D366',
  // Deals and urgency: amber fill with dark-brown text (amber text on white is too faint to read).
  deal: '#f59e0b', dealSoft: '#fef3c7', dealText: '#92400e',
};
export const r = { sm: 8, md: 12, lg: 16, pill: 99 };
export const shadow = { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 } as const;
