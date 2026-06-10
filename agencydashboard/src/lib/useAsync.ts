"use client";

import { useCallback, useEffect, useReducer } from "react";

/**
 * Async-data hook with a process-wide stale-while-revalidate cache.
 *
 * Why a cache: every dashboard screen is a client component that fetches the
 * same handful of resources (roster, jobs, offers, agency profile). Without a
 * cache each navigation re-fetches from scratch behind a spinner. Here the
 * result is cached by key, so:
 *
 *  - revisiting a screen renders cached data instantly (no spinner) while it
 *    revalidates in the background,
 *  - identical requests in flight at once (e.g. the sidebar and a page both
 *    reading the agency profile) share a single network call,
 *  - it still revalidates on every mount, so data never goes stale after a
 *    mutation + navigation.
 *
 * The cache key is derived from the function identity + deps, or passed
 * explicitly via `options.key`. Drop-in compatible with the old hook's
 * `{ data, loading, error, reload, setData }` shape.
 */

type Entry = {
  data: unknown;
  error: string | null;
  hasData: boolean;
  loading: boolean;
  promise: Promise<unknown> | null;
  subs: Set<() => void>;
};

const store = new Map<string, Entry>();

function entryFor(key: string): Entry {
  let e = store.get(key);
  if (!e) {
    e = { data: null, error: null, hasData: false, loading: true, promise: null, subs: new Set() };
    store.set(key, e);
  }
  return e;
}

function notify(e: Entry) {
  e.subs.forEach((fn) => fn());
}

function revalidate<T>(key: string, fn: () => Promise<T>): Promise<T | undefined> {
  const e = entryFor(key);
  if (e.promise) return e.promise as Promise<T>; // share an in-flight request
  if (!e.hasData) e.loading = true;
  const p = fn()
    .then((res) => {
      e.data = res;
      e.error = null;
      e.hasData = true;
      return res;
    })
    .catch((err) => {
      e.error = err instanceof Error ? err.message : "Something went wrong";
      return undefined;
    })
    .finally(() => {
      e.promise = null;
      e.loading = false;
      notify(e);
    });
  e.promise = p;
  notify(e);
  return p;
}

function deriveKey(fn: (...args: unknown[]) => unknown, deps: unknown[]): string {
  return `${fn.name || "anon"}|${JSON.stringify(deps)}`;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  options?: { key?: string },
) {
  const key = options?.key ?? deriveKey(fn as (...a: unknown[]) => unknown, deps);
  const e = entryFor(key);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const reload = useCallback(
    () => revalidate(key, fn),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const setData = useCallback(
    (updater: T | ((prev: T | null) => T)) => {
      const ent = entryFor(key);
      ent.data =
        typeof updater === "function"
          ? (updater as (p: T | null) => T)(ent.data as T | null)
          : updater;
      ent.hasData = true;
      notify(ent);
    },
    [key],
  );

  useEffect(() => {
    const ent = entryFor(key);
    const sub = () => rerender();
    ent.subs.add(sub);
    revalidate(key, fn); // refresh on mount; reuses any in-flight request
    return () => {
      ent.subs.delete(sub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    data: (e.hasData ? e.data : null) as T | null,
    loading: e.loading && !e.hasData,
    error: e.error,
    reload,
    setData,
  };
}
