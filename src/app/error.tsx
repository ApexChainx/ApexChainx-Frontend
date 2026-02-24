"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error and stack trace to the console for debugging
    console.group("🚨 Frontend Error Boundary Caught an Exception");
    console.error("Message:", error.message);
    if (error.stack) {
      console.error("Stack Trace:", error.stack);
    }
    if (error.digest) {
      console.error("Digest:", error.digest);
    }
    console.groupEnd();
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong!
        </h2>
        
        <p className="text-gray-600 mb-6 text-sm">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/* Attempts to re-render the segment safely */}
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          
          {/* Hard reload as a fallback */}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
        </div>

        {/* Optional: Show digest hash in development for easier tracing */}
        {process.env.NODE_ENV === "development" && error.digest && (
          <div className="mt-8 p-3 bg-gray-100 rounded text-xs text-gray-500 text-left overflow-x-auto">
            <p className="font-semibold mb-1">Error Digest:</p>
            <code className="font-mono">{error.digest}</code>
          </div>
        )}
      </div>
    </div>
  );
}