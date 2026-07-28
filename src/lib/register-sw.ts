/** ApexChain Network Operations Intelligence Platform */

import { logger } from "@/lib/logger";

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        logger.info("SW registered", { scope: registration.scope });
      })
      .catch((error) => {
        logger.error("SW registration failed", { message: error instanceof Error ? error.message : String(error) });
      });
  });
}
