import { useEffect } from "react";

// Keeps the screen on while `active` is true. The browser drops the lock when the
// tab is hidden, so it is requested again when the tab becomes visible.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let sentinel = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request("screen");
        if (cancelled) {
          s.release().catch(() => { });
          return;
        }
        sentinel = s;
      } catch {
        /* denied (battery saver, etc.): the call still works */
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => { });
    };
  }, [active]);
}