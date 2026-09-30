"use client";
/** ApexChain Network Operations Intelligence Platform */

import { outageKeys } from "@/features/outages/hooks/useOutageMutations";
import { logger } from "@/lib/logger";
import { type SortField, type SortOrder } from "@/lib/urlState";
import { resolveOutage, updateOutage } from "@/services/outages";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type Outage = {
  id: string;
  title: string;
  site_name: string;
  status: string;
  createdAt: string;
  assigned_to?: string;
};

export type OutagesSort = { field: SortField; order: SortOrder };

const DEFAULT_SORT: OutagesSort = { field: "detected_at", order: "desc" };
const DEFAULT_SORT_VALUE = "detected_at:desc";

/**
 * Sort choices offered by the list. `detected_at` is the API's timestamp field;
 * `title` is the list's client-side display key (see urlState.SortField).
 */
const SORT_OPTIONS: Array<{ value: string; label: string; sort: OutagesSort }> = [
  {
    value: "detected_at:desc",
    label: "Newest",
    sort: { field: "detected_at", order: "desc" },
  },
  {
    value: "detected_at:asc",
    label: "Oldest",
    sort: { field: "detected_at", order: "asc" },
  },
  { value: "title:asc", label: "Title", sort: { field: "title", order: "asc" } },
];

type Props = {
  data?: Outage[];
  isFetching?: boolean;
  searchTerm?: string;
  debouncedSearch?: string;
  /**
   * Controlled sort selection. When omitted the list keeps its own local state,
   * which keeps the component usable standalone (and in existing tests); the
   * connected list passes the URL-backed values so the sort survives
   * navigation (issue #638).
   */
  sort?: OutagesSort;
  onSortChange?: (field: SortField, order: SortOrder) => void;
  /** Controlled search field. When omitted the input keeps its own value. */
  onSearchChange?: (value: string) => void;
};

// Bulk resolve modal component
function BulkResolveModal({
  isOpen,
  selectedIds,
  selectedOutages,
  isResolving,
  error,
  onClose,
  onConfirmResolve,
}: {
  isOpen: boolean;
  selectedIds: string[];
  selectedOutages: Outage[];
  isResolving: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirmResolve: (mttrMinutes: number) => Promise<void>;
}) {
  const [mttrInput, setMttrInput] = useState<string>("60");
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleResolve() {
    if (mttrInput.trim() === "") {
      setValidationError("MTTR is required.");
      return;
    }
    const parsed = Number(mttrInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setValidationError("MTTR must be a non-negative number.");
      return;
    }
    setValidationError(null);
    await onConfirmResolve(parsed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Bulk resolve outages</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Confirm to resolve {selectedIds.length} selected outage{selectedIds.length !== 1 ? 's' : ''}.
          </p>
        </div>

        {/* Audit trail list of IDs */}
        <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Outages to resolve:</p>
          <ul className="space-y-1">
            {selectedOutages.map((outage) => (
              <li key={outage.id} className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-mono">{outage.id}</span> - {outage.site_name || outage.title}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="bulk-resolve-mttr"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Mean time to resolve (minutes)
            </label>
            <input
              id="bulk-resolve-mttr"
              type="number"
              value={mttrInput}
              onChange={(e) => setMttrInput(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
            />
            {validationError && (
              <p className="mt-1 text-xs text-red-600">{validationError}</p>
            )}
            {error && (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isResolving}
              className="px-4 py-2 border rounded-md text-slate-700 dark:text-slate-300 dark:border-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={isResolving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              {isResolving ? "Resolving..." : "Confirm Resolve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bulk assign modal component
function BulkAssignModal({
  isOpen,
  selectedIds,
  selectedOutages,
  isAssigning,
  error,
  onClose,
  onConfirmAssign,
}: {
  isOpen: boolean;
  selectedIds: string[];
  selectedOutages: Outage[];
  isAssigning: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirmAssign: (assignee: string) => Promise<void>;
}) {
  const [assigneeInput, setAssigneeInput] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleAssign() {
    if (!assigneeInput.trim()) {
      setValidationError("Please enter an assignee name or ID.");
      return;
    }
    setValidationError(null);
    await onConfirmAssign(assigneeInput.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Bulk assign outages</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Assign {selectedIds.length} selected outage{selectedIds.length !== 1 ? 's' : ''} to a team member.
          </p>
        </div>

        {/* Audit trail list of IDs */}
        <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Outages to assign:</p>
          <ul className="space-y-1">
            {selectedOutages.map((outage) => (
              <li key={outage.id} className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-mono">{outage.id}</span> - {outage.site_name || outage.title} {outage.assigned_to && `(current: ${outage.assigned_to})`}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="bulk-assign-user"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Assign to (user ID or name)
            </label>
            <input
              id="bulk-assign-user"
              type="text"
              value={assigneeInput}
              onChange={(e) => setAssigneeInput(e.target.value)}
              placeholder="Enter assignee ID or name"
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
            />
            {validationError && (
              <p className="mt-1 text-xs text-red-600">{validationError}</p>
            )}
            {error && (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isAssigning}
              className="px-4 py-2 border rounded-md text-slate-700 dark:text-slate-300 dark:border-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={isAssigning}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              {isAssigning ? "Assigning..." : "Confirm Assign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OutagesPageClient({
  data = [],
  isFetching,
  searchTerm = "",
  debouncedSearch = "",
  sort,
  onSortChange,
  onSearchChange,
}: Props) {
  const queryClient = useQueryClient();
  // -----------------------------
  // State
  // -----------------------------
  const [localSort, setLocalSort] = useState<OutagesSort>(DEFAULT_SORT);
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkResolveOpen, setBulkResolveOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The search term shown in the input (URL-backed when controlled).
  const search = onSearchChange ? searchTerm : localSearch;

  // The active sort comes from the URL when the list is controlled, and from
  // local state otherwise. Only the primitives are used below so the derived
  // list does not recompute on every parent render.
  const activeSort = sort ?? localSort;

  const sortSelectValue =
    SORT_OPTIONS.find(
      (option) => option.value === `${activeSort.field}:${activeSort.order}`,
    )?.value ?? DEFAULT_SORT_VALUE;

  function handleSortChange(nextValue: string) {
    const option = SORT_OPTIONS.find((candidate) => candidate.value === nextValue);
    if (!option) return;
    if (onSortChange) {
      onSortChange(option.sort.field, option.sort.order);
    } else {
      setLocalSort(option.sort);
    }
  }

  function handleSearchChange(nextValue: string) {
    if (onSearchChange) {
      onSearchChange(nextValue);
    } else {
      setLocalSearch(nextValue);
    }
  }

  // -----------------------------
  // Derived Data (Sort only - search is server-side)
  // -----------------------------
  const sortedData = useMemo(() => {
    const result = [...data];

    if (activeSort.field === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      const direction = activeSort.order === "asc" ? 1 : -1;
      result.sort(
        (a, b) =>
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          direction,
      );
    }

    return result;
  }, [data, activeSort.field, activeSort.order]);

  // Get selected outages for modals (use original data for ID matching)
  const selectedOutages = useMemo(() => {
    return data.filter(outage => selectedIds.includes(outage.id));
  }, [data, selectedIds]);

  // -----------------------------
  // Handlers
  // -----------------------------
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  }

  // Select all visible outages
  function toggleSelectAll() {
    if (selectedIds.length === sortedData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedData.map(item => item.id));
    }
  }

  function handleDelete() {
    logger.info("Delete outages requested", { selectedIds });
  }

  function handleExport() {
    logger.info("Export outages requested", { count: sortedData.length });
  }

  // Bulk resolve handler with optimistic update
  async function handleBulkResolve(mttrMinutes: number) {
    setIsProcessing(true);
    setError(null);

    const idsToResolve = [...selectedIds];

    await queryClient.cancelQueries({ queryKey: outageKeys.lists });

    const previousData = queryClient.getQueriesData<{ items: Outage[] }>({
      queryKey: outageKeys.lists,
    });

    // Optimistically update the cache
    previousData.forEach(([queryKey, data]) => {
      if (data) {
        queryClient.setQueryData(queryKey, {
          ...data,
          items: data.items.map((outage) =>
            idsToResolve.includes(outage.id) ? { ...outage, status: "resolved" } : outage
          ),
        });
      }
    });

    try {
      await Promise.all(
        idsToResolve.map((id) => resolveOutage(id, { mttr_minutes: mttrMinutes }))
      );
      // Narrow invalidation - only the current list page
      await queryClient.invalidateQueries({ queryKey: outageKeys.lists, exact: false });
      setSelectedIds([]);
      setBulkResolveOpen(false);
    } catch (err) {
      // Rollback on error
      previousData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      setError(err instanceof Error ? err.message : "Failed to resolve outages. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  // Bulk assign handler with optimistic update
  async function handleBulkAssign(assignee: string) {
    setIsProcessing(true);
    setError(null);

    const idsToAssign = [...selectedIds];

    await queryClient.cancelQueries({ queryKey: outageKeys.lists });

    const previousData = queryClient.getQueriesData<{ items: Outage[] }>({
      queryKey: outageKeys.lists,
    });

    // Optimistically update the cache
    previousData.forEach(([queryKey, data]) => {
      if (data) {
        queryClient.setQueryData(queryKey, {
          ...data,
          items: data.items.map((outage) =>
            idsToAssign.includes(outage.id) ? { ...outage, assigned_to: assignee } : outage
          ),
        });
      }
    });

    try {
      await Promise.all(
        idsToAssign.map((id) => updateOutage(id, { assigned_to: assignee }))
      );
      // Narrow invalidation - only the current list page
      await queryClient.invalidateQueries({ queryKey: outageKeys.lists, exact: false });
      setSelectedIds([]);
      setBulkAssignOpen(false);
    } catch (err) {
      // Rollback on error
      previousData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      setError(err instanceof Error ? err.message : "Failed to assign outages. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="space-y-6">
      {/* Bulk action notification */}
      {selectedIds.length > 0 && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 flex items-center justify-between">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-semibold">{selectedIds.length}</span> outage{selectedIds.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setBulkAssignOpen(true)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Bulk Assign
            </button>
            <button
              onClick={() => setBulkResolveOpen(true)}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Bulk Resolve
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search outages..."
          aria-label="Search outages"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          data-tour="outages-search"
          className="border rounded-md px-3 py-2 w-full sm:max-w-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
        />

        {isFetching && searchTerm !== debouncedSearch && (
          <span className="text-xs text-slate-500 flex items-center gap-1" role="status" aria-live="polite">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Searching…
          </span>
        )}

        <div className="flex gap-2">
          <select
            value={sortSelectValue}
            onChange={(e) => handleSortChange(e.target.value)}
            aria-label="Sort outages"
            className="border rounded-md px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleExport}
            className="px-4 py-2 border rounded-md dark:border-slate-600 dark:text-white"
          >
            Export
          </button>

          <button
            onClick={handleDelete}
            disabled={!selectedIds.length}
            className="px-4 py-2 bg-red-500 text-white rounded-md disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* List header with select all */}
      {sortedData.length > 0 && (
        <div className="flex items-center gap-3 px-1">
          <input
            type="checkbox"
            checked={selectedIds.length === sortedData.length && sortedData.length > 0}
            onChange={toggleSelectAll}
            aria-label="Select all outages"
            className="h-4 w-4"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Select all ({sortedData.length})
          </span>
        </div>
      )}

      {/* List */}
      <div className="grid gap-4" data-tour="outages-list">
        {sortedData.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-4 flex items-center justify-between dark:bg-slate-900 dark:border-slate-700"
          >
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">{item.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                {item.assigned_to && (
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                    Assigned: {item.assigned_to}
                  </span>
                )}
              </div>
            </div>

            <input
              type="checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={() => toggleSelect(item.id)}
              aria-label={`Select ${item.title}`}
              className="h-4 w-4"
            />
          </div>
        ))}
      </div>

      {/* Bulk modals */}
      <BulkResolveModal
        isOpen={bulkResolveOpen}
        selectedIds={selectedIds}
        selectedOutages={selectedOutages}
        isResolving={isProcessing}
        error={error}
        onClose={() => {
          setBulkResolveOpen(false);
          setError(null);
        }}
        onConfirmResolve={handleBulkResolve}
      />

      <BulkAssignModal
        isOpen={bulkAssignOpen}
        selectedIds={selectedIds}
        selectedOutages={selectedOutages}
        isAssigning={isProcessing}
        error={error}
        onClose={() => {
          setBulkAssignOpen(false);
          setError(null);
        }}
        onConfirmAssign={handleBulkAssign}
      />
    </div>
  );
}