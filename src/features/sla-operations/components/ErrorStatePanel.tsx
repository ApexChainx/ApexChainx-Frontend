/** ApexChain Network Operations Intelligence Platform */
/**
 * Inline error state panel (Issue #984).
 *
 * Shown in place of panel/card content when a load has failed. Announced as
 * an alert. The retry button is optional and disabled while a retry is in
 * flight so repeated clicks cannot queue duplicate requests.
 */
import { useId, type ReactNode } from "react";

export interface ErrorStatePanelProps {
  title?: string | undefined;
  /** Error detail shown below the title, e.g. the message from the failed request. */
  description?: string | undefined;
  /** Decorative icon; hidden from assistive technology. */
  icon?: ReactNode | undefined;
  /** Called when the operator asks to retry. Omit to hide the retry button. */
  onRetry?: (() => void) | undefined;
  retryLabel?: string | undefined;
  /** Disables the retry button and swaps its label while a retry is in flight. */
  isRetrying?: boolean | undefined;
  /** Heading level for the title, 2 to 4. Defaults to 3. */
  headingLevel?: 2 | 3 | 4 | undefined;
  className?: string | undefined;
}

const DEFAULT_TITLE = "Something went wrong";
const DEFAULT_RETRY_LABEL = "Retry";

export function ErrorStatePanel({
  title = DEFAULT_TITLE,
  description,
  icon,
  onRetry,
  retryLabel = DEFAULT_RETRY_LABEL,
  isRetrying = false,
  headingLevel = 3,
  className = "",
}: ErrorStatePanelProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as const;

  return (
    <section
      role="alert"
      aria-labelledby={titleId}
      className={`flex flex-col items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-6 text-center text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100 ${className}`.trim()}
    >
      {icon ? (
        <div aria-hidden="true" className="text-3xl">
          {icon}
        </div>
      ) : null}
      <Heading id={titleId} className="text-base font-semibold">
        {title}
      </Heading>
      {description ? <p className="max-w-prose text-sm">{description}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-2 rounded-md border border-red-400 px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRetrying ? "Retrying..." : retryLabel}
        </button>
      ) : null}
    </section>
  );
}

export default ErrorStatePanel;
