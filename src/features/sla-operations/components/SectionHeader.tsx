/** ApexChain Network Operations Intelligence Platform */
/**
 * Section header (Issue #985).
 *
 * Consistent heading/description/actions row for operations panels. Purely
 * presentational: it renders a heading element and leaves grouping the
 * section under it (e.g. `aria-labelledby`) to the caller.
 */
import { type ReactNode } from "react";

export interface SectionHeaderProps {
  title: string;
  description?: string | undefined;
  /** Heading level, 1 to 6. Defaults to 2. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6 | undefined;
  /** Id placed on the heading element, for `aria-labelledby` from a parent `<section>`. */
  headingId?: string | undefined;
  /** Buttons/links rendered at the end of the row, e.g. export or filter actions. */
  actions?: ReactNode | undefined;
  className?: string | undefined;
}

export function SectionHeader({
  title,
  description,
  headingLevel = 2,
  headingId,
  actions,
  className = "",
}: SectionHeaderProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between ${className}`.trim()}
    >
      <div>
        <Heading id={headingId} className="text-lg font-semibold">
          {title}
        </Heading>
        {description ? (
          <p className="mt-1 text-sm opacity-80">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export default SectionHeader;
