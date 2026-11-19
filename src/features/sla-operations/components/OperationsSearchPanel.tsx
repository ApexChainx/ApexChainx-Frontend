/** ApexChain Network Operations Intelligence Platform */
"use client";

import type { FormEvent } from "react";

/**
 * Search and quick-filter panel for operations datasets (Issue #951).
 * Fully controlled; the parent owns the query and active quick filters.
 */
export interface QuickFilterOption {
  value: string;
  label: string;
}

export interface OperationsSearchPanelProps {
  query: string;
  onQueryChange: (query: string) => void;
  quickFilters?: QuickFilterOption[];
  activeFilters?: string[];
  onToggleFilter?: (value: string) => void;
  onClear?: () => void;
  onSubmit?: (query: string) => void;
  resultCount?: number;
  isLoading?: boolean;
  error?: string | null;
}

export function OperationsSearchPanel({
  query,
  onQueryChange,
  quickFilters = [],
  activeFilters = [],
  onToggleFilter,
  onClear,
  onSubmit,
  resultCount,
  isLoading = false,
  error = null,
}: OperationsSearchPanelProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(query.trim());
  };

  return (
    <section aria-label="Operations search" className="space-y-3">
      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="operations-search-input" className="sr-only">
          Search operations
        </label>
        <input
          id="operations-search-input"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search outages, sites or IDs"
          aria-invalid={error ? true : undefined}
          aria-describedby="operations-search-status"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <button type="submit" disabled={isLoading} className="rounded-md border px-3 py-2 text-sm">
          Search
        </button>
        <button type="button" onClick={onClear} className="rounded-md border px-3 py-2 text-sm">
          Clear
        </button>
      </form>

      {quickFilters.length > 0 && (
        <div role="group" aria-label="Quick filters" className="flex flex-wrap gap-2">
          {quickFilters.map((f) => {
            const active = activeFilters.includes(f.value);
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleFilter?.(f.value)}
                className={`rounded-full border px-3 py-1 text-xs ${active ? "font-semibold underline" : ""}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      <p id="operations-search-status" role={error ? "alert" : "status"} className="text-sm">
        {error
          ? error
          : isLoading
            ? "Searching..."
            : resultCount === 0
              ? "No results match your search."
              : resultCount !== undefined
                ? `${resultCount} result${resultCount === 1 ? "" : "s"}`
                : ""}
      </p>
    </section>
  );
}
