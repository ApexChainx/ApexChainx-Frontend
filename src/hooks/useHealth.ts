import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { onlineManager } from "@tanstack/react-query";

// Health is binary for a single endpoint poll: green on success, red on failure.
// The former three-state type advertised a "yellow" (degraded) state the hook
// could never produce; it was removed so the type and the UI agree on the real
// states. A degraded semantic would need its own signal (latency threshold,
// partial outage) and belongs in a future per-source health model.
export type HealthStatus = "green" | "red";

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
