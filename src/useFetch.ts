import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

// GET with loading / error / refetch. Re-runs when the path changes.
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(path));
  const load = useCallback(() => {
    if (!path) return;
    setLoading(true); setError('');
    api<T>(path).then(setData).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [path]);
  useEffect(load, [load]);
  return { data, error, loading, reload: load };
}
