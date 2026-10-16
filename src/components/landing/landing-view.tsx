"use client";
/** ApexChain Network Operations Intelligence Platform */

import type { ComponentType, ReactNode } from "react";

/** Designed empty state shown when the landing view has nothing to render. */
export function LandingEmptyState({ message }: { message?: ReactNode }) {
  return (
    <div
      role="status"
      data-testid="landing-empty-state"
      className="flex flex-col items-center justify-center gap-2 p-12 text-center"
    >
      <span aria-hidden="true" className="text-3xl">
        📭
      </span>
      <p className="text-sm font-medium text-slate-700">
        {message ?? "Nothing to show yet"}
      </p>
      <p className="text-xs text-slate-500">
        Check back after the next reporting window.
      </p>
    </div>
  );
}

export interface LandingViewProps {
  /** The (already lazily-loaded) view to render. */
  view: ComponentType;
  /** When true, render the empty state instead of the view. */
  isEmpty?: boolean;
  /** Optional custom empty state; falls back to `LandingEmptyState`. */
  emptyState?: ReactNode;
}

/**
 * Reusable landing-view shell (#787). Extracted out of the route so any page
 * that lazily loads a dashboard can share the same empty-state handling (#785)
 * instead of duplicating the branch.
 */
export function LandingView({
  view: View,
  isEmpty = false,
  emptyState,
}: LandingViewProps) {
  if (isEmpty) {
    return <>{emptyState ?? <LandingEmptyState />}</>;
  }

  return <View />;
}

export default LandingView;
