import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "mohnyin-cache:";

export function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(data));
  } catch {
    /* storage full or unavailable */
  }
}

/**
 * Offline-first read: renders the last saved copy instantly, then refreshes
 * from the network when a connection is available.
 */
export function useCached<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => readCache<T>(key));
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const fresh = await fetcherRef.current();
      setData(fresh);
      writeCache(key, fresh);
      setStale(false);
    } catch {
      setStale(readCache<T>(key) !== null);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, stale, refresh, setData };
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
