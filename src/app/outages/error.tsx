"use client";

import { ErrorState } from "@/components/shared/ErrorState";

export default function Error({ error }: { error: any }) {
  return (
    <div className="p-6">
      <ErrorState
        error={{
          message: error?.message || "Unexpected error",
          correlationId: error?.correlationId,
        }}
      />
    </div>
  );
}