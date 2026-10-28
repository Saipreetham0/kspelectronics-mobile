// ₹ with Indian digit grouping (done by hand: Intl support differs between devices).
export function inr(amount: number): string {
  const [i, d] = Math.abs(amount).toFixed(2).split('.');
  const last3 = i.slice(-3);
  const rest = i.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${amount < 0 ? '-' : ''}₹${rest ? rest + ',' : ''}${last3}${d === '00' ? '' : '.' + d}`;
}
export const minorToInr = (v: string | number, minor = 2) => inr(Number(v) / 10 ** minor);

// WooCommerce returns HTML-encoded text: tags are dropped, and named ("&rsquo;") and numeric ("&#8217;", "&#x2019;") entities become the characters they stand for.
const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D', ndash: '\u2013', mdash: '\u2014', hellip: '\u2026',
  trade: '\u2122', reg: '\u00AE', copy: '\u00A9', deg: '\u00B0', times: '\u00D7', plusmn: '\u00B1', micro: '\u00B5', bull: '\u2022', middot: '\u00B7', euro: '\u20AC', rupee: '\u20B9', frac12: '\u00BD', ohm: '\u03A9', omega: '\u03C9',
};
export const decodeHtml = (t: string) =>
  t.replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m)
    .trim();

// WooCommerce reports cart amounts without tax and the tax beside them; the shop shows prices with GST included, so the app adds the two.
const num = (v?: string | number | null) => Number(v ?? 0) || 0;
export const withTax = (amount?: string | number | null, tax?: string | number | null) => num(amount) + num(tax);
