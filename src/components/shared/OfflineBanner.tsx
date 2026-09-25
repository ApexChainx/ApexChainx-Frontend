"use client";

/** ApexChain Network Operations Intelligence Platform */
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { mutationQueue } from "@/lib/mutation-queue";
import { onUpdateAvailable } from "@/lib/register-sw";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast("Connection restored", "success");
      // Trigger mutation queue replay
      void mutationQueue.replay();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast("You're offline. Changes will sync when reconnected.", "warning");
    };

    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  useEffect(() => {
    const unsub = onUpdateAvailable(() => {
      setUpdateAvailable(true);
    });
    return unsub;
  }, []);

  if (isOnline && !updateAvailable && mutationQueue.getPending().length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      role="status"
      aria-live="polite"
    >
      {!isOnline && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 shadow-lg flex items-center gap-3">
          <svg className="h-5 w-5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-sm text-yellow-800">You're offline. Changes will sync when reconnected.</span>
        </div>
      )}

      {updateAvailable && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 shadow-lg flex items-center justify-between gap-3">
          <span className="text-sm text-blue-800">A new version is available.</span>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 flex-shrink-0"
          >
            Reload
          </button>
        </div>
      )}

      {mutationQueue.getPending().length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">
            {mutationQueue.getPending().length} pending change{mutationQueue.getPending().length !== 1 ? "s" : ""} will sync when online
          </span>
        </div>
      )}
    </div>
  );
}