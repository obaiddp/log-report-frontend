import { useEffect, useRef } from "react";

export type AutoRefreshOptions = {
  /** How often the callback runs while the tab is visible. */
  intervalMs?: number;
  /** Set to false to pause refreshing, e.g. while a dialog is open. */
  enabled?: boolean;
};

const DEFAULT_INTERVAL_MS = 10_000;

/**
 * Polls `callback` on an interval while the tab is visible.
 *
 * The latest callback is kept in a ref, so re-renders never restart the
 * timer. A tick is skipped while the previous call is still running and
 * errors are swallowed — a background refresh must never break the page or
 * pop an error at the user.
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  options: AutoRefreshOptions = {}
): void {
  const { intervalMs = DEFAULT_INTERVAL_MS, enabled = true } = options;

  const callbackRef = useRef(callback);
  const runningRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const run = async () => {
      // Skip this tick when the previous request is still in flight.
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        await callbackRef.current();
      } catch {
        // Background refreshes fail silently, the next tick tries again.
      } finally {
        runningRef.current = false;
      }
    };

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void run();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void run();
    };

    const onFocus = () => {
      void run();
    };

    const timer = window.setInterval(tick, intervalMs);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, intervalMs]);
}
