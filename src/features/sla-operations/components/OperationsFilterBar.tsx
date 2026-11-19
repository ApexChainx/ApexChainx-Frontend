"use client";

/** ApexChain Network Operations Intelligence Platform */
import type { OperationsFilterState } from "../types/filters";

export interface FilterOption {
  value: string;
  label: string;
}

export interface OperationsFilterBarProps {
  value: OperationsFilterState;
  onChange: (next: OperationsFilterState) => void;
  severityOptions?: FilterOption[];
  statusOptions?: FilterOption[];
  disabled?: boolean;
}

export function OperationsFilterBar({
  value,
  onChange,
  severityOptions = [],
  statusOptions = [],
  disabled = false,
}: OperationsFilterBarProps) {
  const single = (list: string[]) => list[0] ?? "";
  const hasFilters =
    Boolean(value.search) ||
    Boolean(value.dateRange.from) ||
    Boolean(value.dateRange.to) ||
    value.severities.length > 0 ||
    value.statuses.length > 0;

  return (
    <form
      role="search"
      aria-label="Operations filters"
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="flex flex-col text-sm">
        Search
        <input
          type="search"
          disabled={disabled}
          value={value.search ?? ""}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="flex flex-col text-sm">
        From
        <input
          type="date"
          disabled={disabled}
          value={value.dateRange.from ?? ""}
          onChange={(e) =>
            onChange({ ...value, dateRange: { ...value.dateRange, from: e.target.value || undefined } })
          }
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="flex flex-col text-sm">
        To
        <input
          type="date"
          disabled={disabled}
          value={value.dateRange.to ?? ""}
          onChange={(e) =>
            onChange({ ...value, dateRange: { ...value.dateRange, to: e.target.value || undefined } })
          }
          className="rounded border px-2 py-1"
        />
      </label>
      {severityOptions.length > 0 ? (
        <label className="flex flex-col text-sm">
          Severity
          <select
            disabled={disabled}
            value={single(value.severities)}
            onChange={(e) =>
              onChange({ ...value, severities: e.target.value ? [e.target.value] : [] })
            }
            className="rounded border px-2 py-1"
          >
            <option value="">All</option>
            {severityOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      ) : null}
      {statusOptions.length > 0 ? (
        <label className="flex flex-col text-sm">
          Status
          <select
            disabled={disabled}
            value={single(value.statuses)}
            onChange={(e) =>
              onChange({ ...value, statuses: e.target.value ? [e.target.value] : [] })
            }
            className="rounded border px-2 py-1"
          >
            <option value="">All</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        disabled={disabled || !hasFilters}
        onClick={() => onChange({ dateRange: {}, severities: [], statuses: [], sort: value.sort })}
        className="rounded border px-3 py-1 text-sm"
      >
        Clear filters
      </button>
    </form>
  );
}
