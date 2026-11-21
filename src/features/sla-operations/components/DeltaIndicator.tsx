/** ApexChain Network Operations Intelligence Platform */

export type DeltaDirection = "up" | "down" | "flat";

export interface DeltaIndicatorProps {
  /** Signed delta value (e.g. +2.1 or -0.5). */
  value: number | null | undefined;
  /** Optional formatted label override. */
  label?: string | undefined;
  /** Unit suffix, e.g. "%", "ms". */
  unit?: string | undefined;
  /** When true, a lower value is considered positive (e.g. latency). Defaults to false. */
  lowerIsBetter?: boolean | undefined;
  ariaLabel?: string | undefined;
  className?: string | undefined;
}

function directionOf(value: number): DeltaDirection {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

function formatDelta(value: number, unit?: string): string {
  const sign = value > 0 ? "+" : "";
  const suffix = unit ? ` ${unit}` : "";
  return `${sign}${value}${suffix}`;
}

/** Visual indicator for metric deltas in SLA operations. */
export function DeltaIndicator({
  value,
  label,
  unit,
  lowerIsBetter = false,
  ariaLabel,
  className,
}: DeltaIndicatorProps) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return (
      <span className={className} aria-label={ariaLabel ?? "No change data"}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">No change data</span>
      </span>
    );
  }

  const direction = directionOf(value);
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const positive = direction === "flat" ? null : lowerIsBetter ? direction === "down" : direction === "up";
  const tone =
    positive === null
      ? "text-gray-600 dark:text-gray-400"
      : positive
        ? "text-green-700 dark:text-green-400"
        : "text-red-700 dark:text-red-400";
  const text = label ?? formatDelta(value, unit);

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${tone} ${className ?? ""}`.trim()}
      aria-label={ariaLabel ?? `Change ${text}`}
    >
      <span aria-hidden="true">{arrow}</span>
      <span>{text}</span>
    </span>
  );
}

export type HealthStatus = "healthy" | "degraded" | "critical" | "unknown";

export interface HealthDotProps {
  status: HealthStatus;
  label?: string | undefined;
  /** Show text label next to the dot. Defaults to false. */
  showLabel?: boolean | undefined;
  className?: string | undefined;
}

const HEALTH_STYLES: Record<HealthStatus, string> = {
  healthy: "bg-green-500",
  degraded: "bg-amber-500",
  critical: "bg-red-500",
  unknown: "bg-gray-400",
};

const HEALTH_LABELS: Record<HealthStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  critical: "Critical",
  unknown: "Unknown",
};

/** Compact health/status dot for SLA operations views. */
export function HealthDot({ status, label, showLabel = false, className }: HealthDotProps) {
  const text = label ?? HEALTH_LABELS[status] ?? HEALTH_LABELS.unknown;
  const color = HEALTH_STYLES[status] ?? HEALTH_STYLES.unknown;
  return (
    <span
      className={`inline-flex items-center gap-2 ${className ?? ""}`.trim()}
      role="img"
      aria-label={text}
      title={text}
    >
      <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      {showLabel ? <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span> : null}
    </span>
  );
}

export default DeltaIndicator;
