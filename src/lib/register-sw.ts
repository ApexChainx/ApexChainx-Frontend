/** ApexChain Network Operations Intelligence Platform */

import { logger } from "@/lib/logger";

const SW_ENABLED =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  process.env.NODE_ENV !== "development" &&
  process.env.NODE_ENV !== "test";

// Build hash injected at build time
const BUILD_HASH = "__BUILD_HASH__";

/**
 * Register the service worker with a proper update lifecycle, so a new
 * version is fetched in the background and activated without users running
 * the old app shell on stale deploys.
 */
export function registerServiceWorker(): void {
  if (!SW_ENABLED) {
    logger.info("SW registration skipped for non-production environment");
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`/sw.js?v=${BUILD_HASH}`)
      .then((registration) => {
        logger.info("SW registered", { scope: registration.scope });

        registration.update().catch((error) => {
          logger.error("SW update check failed", {
            message: error instanceof Error ? error.message : String(error),
          });
        });

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              logger.info("New SW installed; reloading to activate");

              installing
                // Ask the new worker to take control immediately.
                .postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        // Periodic update check every 30 minutes
        setInterval(() => {
          registration.update().catch(() => {});
        }, 30 * 60 * 1000);
      })
      .catch((error) => {
        logger.error("SW registration failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      });

    // Reload once a new worker that asked to skip waiting takes control.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Listen for update available from SW
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "UPDATE_AVAILABLE") {
        // Dispatch custom event for UI to show update banner
        window.dispatchEvent(new CustomEvent("sw-update-available", { detail: event.data }));
      }
    });
  });
}

// Helper to show update banner (called from layout or root component)
export function onUpdateAvailable(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener("sw-update-available", handler);
  return () => window.removeEventListener("sw-update-available", handler);
}

registerServiceWorker();
