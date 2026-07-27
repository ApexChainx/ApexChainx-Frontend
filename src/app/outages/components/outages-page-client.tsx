"use client";
/** ApexChain Network Operations Intelligence Platform */

import { outageKeys } from "@/features/outages/hooks/useOutageMutations";
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

type Props = {
  data: Outage[];
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
          <p className="text-sm text-slate-500 dark:text-slate-400">
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
          <p className="text-sm text-slate-500 dark:text-slate-400">
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

export default function OutagesPageClient({ data }: Props) {
  const queryClient = useQueryClient();
  // -----------------------------
  // State
  // -----------------------------
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkResolveOpen, setBulkResolveOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------
  // Derived Data (Search + Sort)
  // -----------------------------
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search
    if (search) {
      result = result.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort
    if (sortBy === "date") {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
    }

    if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [data, search, sortBy]);

  // Get selected outages for modals
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
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(item => item.id));
    }
  }

  function handleDelete() {
    console.log("Delete outages:", selectedIds);
  }

  function handleExport() {
    console.log("Export outages:", filteredData);
  }

  // Bulk resolve handler
  async function handleBulkResolve(mttrMinutes: number) {
    setIsProcessing(true);
    setError(null);
    try {
      await Promise.all(
        selectedIds.map(id => resolveOutage(id, { mttr_minutes: mttrMinutes }))
      );
      await queryClient.invalidateQueries({ queryKey: outageKeys.all });
      setSelectedIds([]);
      setBulkResolveOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve outages. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  // Bulk assign handler
  async function handleBulkAssign(assignee: string) {
    setIsProcessing(true);
    setError(null);
    try {
      await Promise.all(
        selectedIds.map(id => updateOutage(id, { assigned_to: assignee }))
      );
      await queryClient.invalidateQueries({ queryKey: outageKeys.all });
      setSelectedIds([]);
      setBulkAssignOpen(false);
    } catch (err) {
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
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search outages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-md px-3 py-2 w-full sm:max-w-sm"
        />

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "date" | "title")
            }
            className="border rounded-md px-3 py-2"
          >
            <option value="date">Newest</option>
            <option value="title">Title</option>
          </select>

          <button
            onClick={handleExport}
            className="px-4 py-2 border rounded-md"
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

      {/* List */}
      <div className="grid gap-4">
        {filteredData.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <h3 className="font-medium">{item.title}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>

            <input
              type="checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={() => toggleSelect(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}