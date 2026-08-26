import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { onlineManager } from "@tanstack/react-query";

export type HealthStatus = "green" | "red";

export function useHealth() {
  const [status, setStatus] = useState<HealthStatus>("green");
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let checking = false;
    let disposed = false;

    const scheduleCheck = (delay = 0) => {
      if (disposed || !navigator.onLine || timeoutId !== null) return;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        void checkHealth();
      }, delay);
    };

    const checkHealth = async () => {
      if (disposed || !navigator.onLine || checking) return;
      checking = true;
      try {
        await api.get("/health", { timeout: 5000 });
        if (!disposed) setStatus("green");
      } catch {
        if (!disposed) setStatus("red");
      } finally {
        checking = false;
        scheduleCheck(30000);
      }
    };

    const updateOnlineStatus = () => {
      const browserOnline = navigator.onLine;
      setIsOffline(!browserOnline);
      onlineManager.setOnline(browserOnline);

      if (!browserOnline) {
        setStatus("red");
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } else {
        scheduleCheck();
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      disposed = true;
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, []);

  return { status, isOffline };
}
