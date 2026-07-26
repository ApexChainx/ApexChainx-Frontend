"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useEffect } from "react";
import { RouteErrorState } from "@/components/ui/route-state";
import { logger } from "@/lib/logger";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("route-error-boundary", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="space-y-6 p-6">
      <RouteErrorState
        title="Create Outage Error"
        description={
          error.message || "An unexpected error occurred while loading this page."
        }
        primaryAction={{
          label: "Try again",
          onClick: reset,
        }}
        secondaryAction={{
          label: "Reload page",
          onClick: () => window.location.reload(),
        }}
      />
    </div>
  );
}
