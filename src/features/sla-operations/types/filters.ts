/** ApexChain Network Operations Intelligence Platform */
/**
 * Shared filter and sort types (Issue #908).
 *
 * Reusable state shapes for SLA operations tables and panels. The module
 * keeps selections (severity/status) as plain string unions so it remains
 * usable by hooks and components across the workspace without coupling to a
 * single domain module.
 */

/** Direction of a sort operation. */
export type SortDirection = "asc" | "desc";

/** Inclusive date range bound by ISO date strings. */
export interface DateRange {
  from?: string | undefined;
  to?: string | undefined;
}

/** Describes which field a table is sorted by and in which direction. */
export interface SortDescriptor<TField extends string = string> {
  field: TField;
  direction: SortDirection;
}

/** A selection expressed as "all", an allow-list or a deny-list. */
export type FilterSelection =
  | { kind: "all" }
  | { kind: "include"; values: string[] }
  | { kind: "exclude"; values: string[] };

/** Generic filter state shared by operations tables and panels. */
export interface OperationsFilterState {
  search?: string | undefined;
  dateRange: DateRange;
  severities: string[];
  statuses: string[];
  sort?: SortDescriptor | undefined;
}

/** Outage-specific extension of the shared filter state. */
export interface OutageFilterState extends OperationsFilterState {
  siteId?: string | undefined;
  assignedTo?: string | undefined;
}
