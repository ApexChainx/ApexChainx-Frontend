/** ApexChain Network Operations Intelligence Platform */

import { logger } from "@/lib/logger";

const SW_ENABLED =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  process.env.NODE_ENV !== "development" &&
  process.env.NODE_ENV !== "test";

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
      .register("/sw.js")
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
  });
}

registerServiceWorker();
