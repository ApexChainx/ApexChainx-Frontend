import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { onlineManager } from "@tanstack/react-query";

export type HealthStatus = "green" | "yellow" | "red";

export function useHealth() {
  const [status, setStatus] = useState<HealthStatus>("green");
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        setIsOffline(true);
        setStatus("red");
        onlineManager.setOnline(false);
      } else {
        setIsOffline(false);
        onlineManager.setOnline(true);
      }
    };
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    let timeoutId: ReturnType<typeof setTimeout>;

    const checkHealth = async () => {
      if (!navigator.onLine) return;
      try {
        await api.get("/health", { timeout: 5000 });
        setStatus("green");
        setIsOffline(false);
        onlineManager.setOnline(true);
      } catch (e) {
        setStatus("red");
        setIsOffline(true);
        onlineManager.setOnline(false);
      }

      if (navigator.onLine) {
        timeoutId = setTimeout(checkHealth, 30000); // 30 seconds
      }
    };

    if (navigator.onLine) {
      checkHealth();
    }

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      clearTimeout(timeoutId);
    };
  }, []);

  return { status, isOffline };
}
