"use client";

import type { ReactNode } from "react";

import {
  AlertTriangleIcon,
  RefreshCwIcon,
  RotateCcwIcon,
} from "@/components/ui/icons";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type ActionButtonProps = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
};

type BaseRouteStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

type RouteEmptyStateProps = BaseRouteStateProps & {
  action?: ActionButtonProps;
};

type RouteErrorStateProps = BaseRouteStateProps & {
  primaryAction?: ActionButtonProps;
  secondaryAction?: ActionButtonProps;
};

/* -------------------------------------------------------------------------- */
/*                               Shared Wrapper                               */
/* -------------------------------------------------------------------------- */

function RouteStateContainer({
  title,
  description,
  icon,
  children,
  className = "",
}: BaseRouteStateProps) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-10">
      <div
        className={`w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm ${className}`}
      >
        {icon ? (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            {icon}
          </div>
        ) : null}

        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {description}
        </p>

        {children ? (
          <div className="mt-6">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Shared Buttons                               */
/* -------------------------------------------------------------------------- */

function ActionButton({
  label,
  onClick,
  icon,
  variant = "primary",
}: ActionButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800 border-transparent"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${styles}`}
    >
      {icon}
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Loading State                                 */
/* -------------------------------------------------------------------------- */

export function RouteLoadingState({
  title,
  description,
}: Pick<BaseRouteStateProps, "title" | "description">) {
  return (
    <RouteStateContainer
      title={title}
      description={description}
      className="border-slate-200"
      icon={
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      }
    >
      <div className="mt-4">
        <div className="mx-auto h-2 w-40 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full animate-pulse rounded-full bg-slate-300" />
        </div>
      </div>
    </RouteStateContainer>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Empty State                                  */
/* -------------------------------------------------------------------------- */

export function RouteEmptyState({
  title,
  description,
  action,
  icon,
}: RouteEmptyStateProps) {
  return (
    <RouteStateContainer
      title={title}
      description={description}
      icon={icon}
      className="border-dashed border-slate-200 bg-slate-50"
    >
      {action ? (
        <ActionButton
          label={action.label}
          onClick={action.onClick}
          icon={action.icon}
          variant="secondary"
        />
      ) : null}
    </RouteStateContainer>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Error State                                  */
/* -------------------------------------------------------------------------- */

export function RouteErrorState({
  title,
  description,
  primaryAction,
  secondaryAction,
}: RouteErrorStateProps) {
  return (
    <RouteStateContainer
      title={title}
      description={description}
      className="border-red-200"
      icon={
        <AlertTriangleIcon className="h-7 w-7 text-red-600" />
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        {primaryAction ? (
          <ActionButton
            label={primaryAction.label}
            onClick={primaryAction.onClick}
            icon={
              primaryAction.icon ?? (
                <RotateCcwIcon className="h-4 w-4" />
              )
            }
            variant="primary"
          />
        ) : null}

        {secondaryAction ? (
          <ActionButton
            label={secondaryAction.label}
            onClick={secondaryAction.onClick}
            icon={
              secondaryAction.icon ?? (
                <RefreshCwIcon className="h-4 w-4" />
              )
            }
            variant="secondary"
          />
        ) : null}
      </div>
    </RouteStateContainer>
  );
}