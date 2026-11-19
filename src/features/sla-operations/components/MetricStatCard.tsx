/** ApexChain Network Operations Intelligence Platform */
/**
 * Compact KPI / stat card (Issue #979).
 *
 * Presentational only: callers pass already formatted values. A missing value
 * renders an explicit placeholder (with screen-reader text) instead of an
 * empty box, and `isLoading` renders a busy placeholder in the same footprint
 * so the layout does not shift.
 */
import { useId } from "react";

import type { KpiSemanticState, KpiTrendDirection } from "../types/kpi";

/** Change relative to a comparison period. */
export interface MetricStatTrend {
  direction: KpiTrendDirection;
  /** Preformatted change, e.g. "+2.1%". */
  value: string;
  /** What the change is compared with, e.g. "vs last week". */
  comparisonLabel?: string | undefined;
}

export interface MetricStatCardProps {
  label: string;
  /** Preformatted value. `null`, `undefined` and blank strings show the placeholder. */
  value?: string | number | null | undefined;
  /** Unit shown after the value, e.g. "min". */
  unit?: string | undefined;
  helperText?: string | undefined;
  trend?: MetricStatTrend | undefined;
  /** Semantic colour state. Defaults to "neutral". */
  state?: KpiSemanticState | undefined;
  isLoading?: boolean | undefined;
  /** Placeholder shown when there is no value. Defaults to an em dash. */
  emptyLabel?: string | undefined;
  className?: string | undefined;
}

const STATE_STYLES: Record<KpiSemanticState, string> = {
  positive:
    "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
  neutral:
    "border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100",
  warning:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  negative:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
};

const TREND_ARROW: Record<KpiTrendDirection, string> = {
  up: "▲",
  down: "▼",
  flat: "▬",
};

const TREND_TEXT: Record<KpiTrendDirection, string> = {
  up: "Up",
  down: "Down",
  flat: "Unchanged",
};

const DEFAULT_EMPTY_LABEL = "—";

/** True when a value should be rendered rather than replaced by the placeholder. */
function hasValue(value: MetricStatCardProps["value"]): value is string | number {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  return typeof value === "string" && value.trim() !== "";
}

export function MetricStatCard({
  label,
  value,
  unit,
  helperText,
  trend,
  state = "neutral",
  isLoading = false,
  emptyLabel = DEFAULT_EMPTY_LABEL,
  className = "",
}: MetricStatCardProps) {
  const labelId = useId();
  const present = hasValue(value);

  return (
    <article
      aria-labelledby={labelId}
      aria-busy={isLoading}
      data-state={state}
      className={`rounded-lg border p-4 ${STATE_STYLES[state]} ${className}`.trim()}
    >
      <p id={labelId} className="text-sm font-medium">
        {label}
      </p>

      {isLoading ? (
        <div className="mt-2" role="status">
          <span className="sr-only">Loading {label}</span>
          <div
            aria-hidden="true"
            className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
          />
        </div>
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold">
            {present ? (
              <>
                <span data-testid="metric-stat-value">{value}</span>
                {unit ? <span className="ml-1 text-sm font-normal">{unit}</span> : null}
              </>
            ) : (
              <>
                <span aria-hidden="true">{emptyLabel}</span>
                <span className="sr-only">No data</span>
              </>
            )}
          </p>

          {trend ? (
            <p className="mt-1 text-xs" data-direction={trend.direction}>
              <span aria-hidden="true">{TREND_ARROW[trend.direction]}</span>{" "}
              <span className="sr-only">{TREND_TEXT[trend.direction]}: </span>
              {trend.value}
              {trend.comparisonLabel ? ` ${trend.comparisonLabel}` : ""}
            </p>
          ) : null}

          {helperText ? <p className="mt-1 text-xs opacity-80">{helperText}</p> : null}
        </>
      )}
    </article>
  );
}

export default MetricStatCard;
