/** ApexChain Network Operations Intelligence Platform */
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { onlineManager } from "@tanstack/react-query";

import { useIntervalWhenVisible } from "@/hooks/useIntervalWhenVisible";

export type HealthStatus = "green" | "red";

const HEALTH_POLL_INTERVAL_MS = 30_000;

export function useHealth() {
  const [status, setStatus] = useState<HealthStatus>("green");
  const [isOffline, setIsOffline] = useState(false);
  const inFlightRef = useRef(false);

  const checkHealth = useCallback(async () => {
    // The browser's connectivity flag is the cheapest gate: pinging the
    // backend while offline only produces noise (and a guaranteed failure).
    // The in-flight guard keeps a slow response from stacking requests.
    if (!navigator.onLine || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await api.get("/health", { timeout: 5000 });
      setStatus("green");
    } catch {
      // Backend reachability is separate from browser connectivity. Keep
      // React Query online when the browser still has network access.
      setStatus("red");
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // Issue #604 — a backgrounded tab has nobody watching the badge, so the
  // 30-second heartbeat suspends while `document.hidden` and resumes
  // immediately on visibilitychange instead of polling forever.
  useIntervalWhenVisible(checkHealth, HEALTH_POLL_INTERVAL_MS);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const browserOnline = navigator.onLine;
      setIsOffline(!browserOnline);
      onlineManager.setOnline(browserOnline);
      if (browserOnline) {
        void checkHealth();
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [checkHealth]);

  return { status, isOffline };
}
