/** ApexChain Network Operations Intelligence Platform */
/**
 * Reusable empty-state panel (Issue #982).
 *
 * Shown when an operations view has nothing to display: no results, no data
 * yet, or a failed load. The default variant is announced politely as a
 * status; the `error` variant is announced as an alert. The action is
 * optional and rendered as a real button.
 */
import { useId, type ReactNode } from "react";

export type EmptyStateVariant = "empty" | "no-results" | "error";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  disabled?: boolean | undefined;
}

export interface EmptyStatePanelProps {
  title: string;
  description?: string | undefined;
  /** Decorative icon; hidden from assistive technology. */
  icon?: ReactNode | undefined;
  /** Optional call to action, e.g. "Clear filters" or "Retry". */
  action?: EmptyStateAction | undefined;
  /**
   * "empty" (default): nothing to show yet. "no-results": filters or search
   * matched nothing. "error": the data could not be loaded.
   */
  variant?: EmptyStateVariant | undefined;
  /** Heading level for the title, 2 to 4. Defaults to 3. */
  headingLevel?: 2 | 3 | 4 | undefined;
  /** Extra content below the description, e.g. a link. */
  children?: ReactNode | undefined;
  className?: string | undefined;
}

const VARIANT_STYLES: Record<EmptyStateVariant, string> = {
  empty: "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300",
  "no-results": "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300",
  error: "border-red-300 text-red-800 dark:border-red-800 dark:text-red-200",
};

export function EmptyStatePanel({
  title,
  description,
  icon,
  action,
  variant = "empty",
  headingLevel = 3,
  children,
  className = "",
}: EmptyStatePanelProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as const;

  return (
    <section
      role={variant === "error" ? "alert" : "status"}
      aria-labelledby={titleId}
      data-variant={variant}
      className={`flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center ${VARIANT_STYLES[variant]} ${className}`.trim()}
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
      {children}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.disabled ?? false}
          className="mt-2 rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {action.label}
        </button>
      ) : null}
    </section>
  );
}

export default EmptyStatePanel;
