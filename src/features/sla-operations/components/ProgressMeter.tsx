/** ApexChain Network Operations Intelligence Platform */

export interface ProgressMeterProps {
  /** Current value to display. */
  value: number;
  /** Maximum value for the meter. Defaults to 100. */
  max?: number | undefined;
  /** Optional SLA/target threshold to mark on the meter. */
  threshold?: number | null | undefined;
  label?: string | undefined;
  /** Accessible label when no visible label is provided. */
  ariaLabel?: string | undefined;
  /** Show percentage text. Defaults to true. */
  showValue?: boolean | undefined;
  className?: string | undefined;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function toPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return clamp((value / max) * 100, 0, 100);
}

/** Progress/threshold meter for SLA-related metrics. */
export function ProgressMeter({
  value,
  max = 100,
  threshold = null,
  label,
  ariaLabel,
  showValue = true,
  className,
}: ProgressMeterProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? clamp(value, 0, safeMax) : 0;
  const percent = toPercent(safeValue, safeMax);
  const thresholdPercent =
    typeof threshold === "number" && Number.isFinite(threshold)
      ? toPercent(threshold, safeMax)
      : null;

  return (
    <div className={className}>
      {label ? <div className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">{label}</div> : null}
      <div
        role="progressbar"
        aria-label={ariaLabel ?? label ?? "Progress"}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.round(safeValue)}
        className="relative h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-800"
      >
        <div
          className="h-full bg-blue-600 dark:bg-blue-500"
          style={{ width: `${percent}%` }}
        />
        {thresholdPercent !== null ? (
          <span
            aria-hidden="true"
            className="absolute top-0 h-full w-0.5 bg-amber-500"
            style={{ left: `${thresholdPercent}%` }}
            title="Threshold"
          />
        ) : null}
      </div>
      {showValue ? (
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {Math.round(percent)}%{thresholdPercent !== null ? ` (threshold ${Math.round(thresholdPercent)}%)` : ""}
        </div>
      ) : null}
      {!Number.isFinite(value) ? <span className="sr-only">Value unavailable</span> : null}
    </div>
  );
}

export type InfoBannerVariant = "info" | "success" | "warning" | "error";

export interface InfoBannerProps {
  title?: string | undefined;
  message: string;
  variant?: InfoBannerVariant | undefined;
  className?: string | undefined;
}

const VARIANT_STYLES: Record<InfoBannerVariant, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
  success: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
  warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
};

/** Informational banner for SLA operations context. */
export function InfoBanner({ title, message, variant = "info", className }: InfoBannerProps) {
  const role = variant === "error" || variant === "warning" ? "alert" : "status";
  return (
    <div
      role={role}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`rounded border p-3 text-sm ${VARIANT_STYLES[variant]} ${className ?? ""}`.trim()}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <p>{message}</p>
    </div>
  );
}

export default ProgressMeter;
