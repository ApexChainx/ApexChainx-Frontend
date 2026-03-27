"use client";

import {
  AlertTriangleIcon,
  RefreshCwIcon,
  RotateCcwIcon,
} from "@/components/ui/icons";

type RouteStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

type RouteErrorStateProps = RouteStateProps & {
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

export function RouteLoadingState({
  title,
  description,
}: Pick<RouteStateProps, "title" | "description">) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-slate-200" />
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function RouteEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: RouteStateProps) {
  return (
    <div className="flex min-h-[30vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function RouteErrorState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: RouteErrorStateProps) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangleIcon className="h-7 w-7 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {actionLabel && onAction ? (
            <button
              onClick={onAction}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              <RotateCcwIcon className="h-4 w-4" />
              {actionLabel}
            </button>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              <RefreshCwIcon className="h-4 w-4" />
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
