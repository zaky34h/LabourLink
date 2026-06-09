"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Tiny async-data hook for client screens. Runs `fn` on mount (and whenever the
 * `deps` change) and exposes loading/error/reload. Swap-in-place for a real data
 * library (SWR / React Query) later if desired.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fn()
      .then((res) => alive && setData(res))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Something went wrong"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(run, [run]);

  return { data, loading, error, reload: run, setData };
}
