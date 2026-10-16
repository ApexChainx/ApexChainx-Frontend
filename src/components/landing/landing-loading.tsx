"use client";
/** ApexChain Network Operations Intelligence Platform */

import { memo } from "react";

/**
 * Stable loading fallback for the lazily-loaded landing dashboard (#782).
 *
 * Defined once at module scope (rather than as an inline JSX arrow passed to
 * `next/dynamic`) so its element *type* never changes between renders — React
 * can then reuse the subtree instead of unmounting and remounting the
 * fallback while the chunk loads.
 */
export const LandingLoadingFallback = memo(function LandingLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center p-12"
    >
      <div className="text-sm text-gray-500">Loading dashboard...</div>
    </div>
  );
});
