import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';

const RETRY_MS = [5000, 10000, 20000]; // a store hiccup (WordPress slow, a 502) usually clears within a minute

// GET with loading / error / refetch. Re-runs when the path changes. Only the latest request's answer is used, and nothing is set after unmount.
// A failure that may be temporary (server error, no connection) is retried on its own a few times; `error` shows only once those are used up.
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(path));
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const load = useCallback((): Promise<void> => {
    if (!path) return Promise.resolve();
    const id = ++seq.current;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setLoading(true); setError('');
    // `seq` moves on when the path changes, on reload and on unmount, so an older request (or its retry) never sets anything.
    const attempt = (n: number): Promise<void> => api<T>(path).then((d) => {
      if (id !== seq.current) return;
      setData(d); setLoading(false);
    }).catch((e: Error) => {
      if (id !== seq.current) return;
      const temporary = e instanceof ApiError && (e.status === 0 || e.status >= 500);
      if (temporary && n < RETRY_MS.length) {
        timer.current = setTimeout(() => { if (id === seq.current) attempt(n + 1); }, RETRY_MS[n]);
        return; // stays "loading" meanwhile
      }
      setError(e.message); setLoading(false);
    });
    attempt(0);
    return Promise.resolve();
  }, [path]);
  useEffect(() => {
    load();
    return () => {
      seq.current++;
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    };
  }, [load]);
  return { data, error, loading, reload: load };
}
