/** ApexChain Network Operations Intelligence Platform */
/**
 * Loading skeleton block (Issue #983).
 *
 * A reusable placeholder shown in place of panel/card content while data is
 * loading. The animated bars are decorative (`aria-hidden`); the block itself
 * is a single `role="status"` region so screen readers announce one busy
 * message instead of one per bar.
 */
export type LoadingSkeletonVariant = "text" | "card" | "table-row" | "circle";

export interface LoadingSkeletonBlockProps {
  /**
   * Shape of the placeholder. "text" (default): stacked lines. "card": a
   * block with a title bar and body. "table-row": a row of evenly spaced
   * cells. "circle": a single circular placeholder (e.g. an avatar).
   */
  variant?: LoadingSkeletonVariant | undefined;
  /** Number of lines ("text") or cells ("table-row"). Ignored otherwise. Defaults to 3. */
  lines?: number | undefined;
  /** Accessible label announced while loading. Defaults to "Loading content". */
  label?: string | undefined;
  className?: string | undefined;
}

const BAR = "animate-pulse rounded bg-gray-200 dark:bg-gray-700";

function clampLines(lines: number): number {
  if (!Number.isFinite(lines)) return 1;
  return Math.max(1, Math.min(12, Math.trunc(lines)));
}

function TextSkeleton({ lines }: { lines: number }) {
  return (
    <div aria-hidden="true" className="space-y-2">
      {Array.from({ length: clampLines(lines) }, (_, index) => (
        <div
          key={index}
          className={`h-3 ${BAR}`}
          style={{ width: index === clampLines(lines) - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <div className={`h-4 w-1/3 ${BAR}`} />
      <div className={`h-20 w-full ${BAR}`} />
    </div>
  );
}

function TableRowSkeleton({ lines }: { lines: number }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      {Array.from({ length: clampLines(lines) }, (_, index) => (
        <div key={index} className={`h-4 flex-1 ${BAR}`} />
      ))}
    </div>
  );
}

function CircleSkeleton() {
  return <div aria-hidden="true" className={`h-10 w-10 rounded-full ${BAR}`} />;
}

export function LoadingSkeletonBlock({
  variant = "text",
  lines = 3,
  label = "Loading content",
  className = "",
}: LoadingSkeletonBlockProps) {
  return (
    <div role="status" aria-label={label} data-variant={variant} className={className}>
      <span className="sr-only">{label}</span>
      {variant === "card" ? (
        <CardSkeleton />
      ) : variant === "table-row" ? (
        <TableRowSkeleton lines={lines} />
      ) : variant === "circle" ? (
        <CircleSkeleton />
      ) : (
        <TextSkeleton lines={lines} />
      )}
    </div>
  );
}

export default LoadingSkeletonBlock;
