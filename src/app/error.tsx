"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useEffect } from "react";
import { RouteErrorState } from "@/components/ui/route-state";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("error-boundary", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="space-y-6 bg-slate-50">
      <RouteErrorState
        title="Something went wrong"
        description={
          error.message || "An unexpected error occurred while loading this page."
        }
        actionLabel="Try again"
        onAction={reset}
        secondaryActionLabel="Reload page"
        onSecondaryAction={() => window.location.reload()}
      />
      {process.env.NODE_ENV === "development" && error.digest ? (
        <div className="mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm">
          <p className="mb-1 font-semibold text-slate-700">Error digest</p>
          <code className="font-mono">{error.digest}</code>
        </div>
      ) : null}
    </div>
  );
}
