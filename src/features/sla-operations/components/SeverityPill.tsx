/** ApexChain Network Operations Intelligence Platform */
/**
 * Severity pill (Issue #978).
 *
 * Shows an outage severity as a small pill. Raw backend values such as
 * "minor" or "urgent" are normalised with the workspace severity utilities,
 * and anything unrecognised renders as "Unknown" rather than throwing. The
 * level is conveyed by text and a shape glyph as well as colour, and the
 * visible text is prefixed for screen readers ("Severity: High").
 */
import { getSeverityLabel, normalizeSeverity, type Severity } from "../utils/severity";

export type SeverityPillSize = "sm" | "md";

export interface SeverityPillProps {
  /** Raw severity value; `null`, `undefined` and unknown values render "Unknown". */
  severity?: string | null | undefined;
  /** Overrides the visible label. Defaults to the normalised severity label. */
  label?: string | undefined;
  size?: SeverityPillSize | undefined;
  /** Hide the screen-reader "Severity:" prefix when the context already says it. */
  hideAccessiblePrefix?: boolean | undefined;
  className?: string | undefined;
}

type PillTone = Severity | "unknown";

const TONE_STYLES: Record<PillTone, string> = {
  low: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  medium:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  high: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200",
  critical:
    "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  unknown:
    "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
};

/** Shape glyphs so the level is not signalled by colour alone. */
const TONE_GLYPH: Record<PillTone, string> = {
  low: "▽",
  medium: "◇",
  high: "△",
  critical: "▲",
  unknown: "?",
};

const SIZE_STYLES: Record<SeverityPillSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export function SeverityPill({
  severity,
  label,
  size = "sm",
  hideAccessiblePrefix = false,
  className = "",
}: SeverityPillProps) {
  const normalized = normalizeSeverity(severity);
  const tone: PillTone = normalized ?? "unknown";
  const text = label ?? getSeverityLabel(severity);

  return (
    <span
      data-severity={tone}
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${TONE_STYLES[tone]} ${SIZE_STYLES[size]} ${className}`.trim()}
    >
      <span aria-hidden="true">{TONE_GLYPH[tone]}</span>
      {hideAccessiblePrefix ? null : <span className="sr-only">Severity: </span>}
      {text}
    </span>
  );
}

export default SeverityPill;
