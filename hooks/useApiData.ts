'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/client/api';

/** Fetches dashboard data; pass `null` to skip. `reload()` refetches; `pollMs` enables lightweight polling. */
export function useApiData<T>(path: string | null, opts: { pollMs?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);

  const load = useCallback(async (silent = false) => {
    if (path === null) { setData(null); setLoading(false); return; }
    if (!silent) setLoading(true);
    try { setData(await api<T>(path)); setError(null); } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [path]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!opts.pollMs || path === null) return;
    const t = setInterval(() => void load(true), opts.pollMs);
    return () => clearInterval(t);
  }, [opts.pollMs, path, load]);

  return { data, error, loading, reload: () => load(true) };
}
