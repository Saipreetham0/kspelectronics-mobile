// When a search finds nothing (a typo, a plural, one word too many), the shop tries these looser versions in turn and shows what the first one finds.
export function alternatives(query: string): string[] {
  const q = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const words = q.split(' ').filter(Boolean);
  const out: string[] = [];
  const add = (t: string) => { t = t.trim(); if (t.length >= 3 && t !== q && !out.includes(t)) out.push(t); };
  if (words.length > 1) {
    add(words.slice(0, -1).join(' '));                        // drop the last word
    [...words].sort((a, b) => b.length - a.length).forEach(add); // each word alone, longest first
  }
  for (const w of words.slice(0, 2)) {
    if (w.endsWith('s') && w.length > 4) add(w.slice(0, -1)); // plural
    if (w.length >= 6) add(w.slice(0, Math.ceil(w.length * 0.7))); // a typo near the end
  }
  return out.slice(0, 4);
}
