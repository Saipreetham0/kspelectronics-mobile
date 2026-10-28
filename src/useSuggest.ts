import { useEffect, useRef, useState } from 'react';
import { api } from './api';

export type Suggestions = {
  products: { id: number; name: string; slug: string; image: string; price: string; inStock: boolean; hasOptions?: boolean }[];
  categories: { name: string; slug: string; parent: string }[];
};
const EMPTY: Suggestions = { products: [], categories: [] };

// Live search suggestions for the text typed so far: fetched a moment after the last keystroke, and an answer for an older query is dropped.
export function useSuggest(text: string) {
  const term = text.trim();
  const [data, setData] = useState<{ term: string; result: Suggestions } | null>(null);
  const latest = useRef('');
  useEffect(() => {
    latest.current = term;
    if (term.length < 2) return;
    const t = setTimeout(() => {
      api<Suggestions>(`/api/search/suggest?q=${encodeURIComponent(term)}`)
        .then((result) => { if (latest.current === term) setData({ term, result }); })
        .catch(() => { if (latest.current === term) setData({ term, result: EMPTY }); });
    }, 250);
    return () => clearTimeout(t);
  }, [term]);
  const ready = data?.term === term;
  return { term, result: ready ? data.result : EMPTY, loading: term.length >= 2 && !ready };
}
