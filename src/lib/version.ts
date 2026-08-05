import { useEffect } from "react";

declare const __APP_BUILD_ID__: string | undefined;

const RELOAD_GUARD = "mohnyin-version-reloaded";

export function currentBuildId(): string {
  try {
    return typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "dev";
  } catch {
    return "dev";
  }
}

async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { version?: string };
    return typeof json.version === "string" ? json.version : null;
  } catch {
    return null; // offline / not served: keep using the offline cache
  }
}

async function clearBrowserCaches() {
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Version check on every app open:
 *  - online + newer build available -> clear caches and auto-refresh once
 *  - offline -> do nothing, the saved offline data keeps working
 *  - back online / tab visible again -> check again
 */
export function useVersionCheck() {
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (cancelled) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      const remote = await fetchRemoteVersion();
      if (cancelled || !remote) return;

      const local = currentBuildId();
      if (local === "dev" || remote === local) {
        sessionStorage.removeItem(RELOAD_GUARD);
        return;
      }
      // avoid reload loops if the server keeps serving the old bundle
      if (sessionStorage.getItem(RELOAD_GUARD) === remote) return;
      sessionStorage.setItem(RELOAD_GUARD, remote);

      await clearBrowserCaches();
      window.location.reload();
    };

    void check();

    const onOnline = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
