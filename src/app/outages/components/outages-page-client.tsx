"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { VisibilityState } from "@tanstack/react-table";

import { DataTable, type TableDensity } from "@/components/data-table";
import ExportDropdown from "@/components/outages/ExportDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RouteEmptyState, RouteErrorState, RouteLoadingState } from "@/components/ui/route-state";
import { useOutages } from "@/features/outages/hooks/useOutages";
import { useFilterPresets, useOutagesTableState } from "@/hooks/useOutagesTableState";
import { deleteOutage } from "@/services/outages";
import type { Outage } from "@/types/outages";
import type { ColumnDef } from "@tanstack/react-table";

const VISIBILITY_KEY = "outages-table-visibility";
const DENSITY_KEY = "outages-table-density";

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const DEFAULT_VISIBILITY: VisibilityState = {
  id: true,
  site_name: true,
  severity: true,
  status: true,
  detected_at: true,
  affected_services: true,
};

// Non-critical columns that can be toggled off
const OPTIONAL_COLUMNS = new Set(["detected_at", "affected_services"]);
import { useFilterPresets, useOutagesTableState, type SortField, type SortOrder } from "@/hooks/useOutagesTableState";
import type { Outage } from "@/types/outages";
import type { ColumnDef } from "@tanstack/react-table";

const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: "detected_at", label: "Detected" },
  { value: "severity", label: "Severity" },
  { value: "status", label: "Status" },
];

function SortHeader({
  label,
  field,
  currentField,
  currentOrder,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField?: SortField;
  currentOrder: SortOrder;
  onSort: (field: SortField, order: SortOrder) => void;
}) {
  const isActive = currentField === field;
  const nextOrder: SortOrder = isActive && currentOrder === "asc" ? "desc" : "asc";
  return (
    <button
      className="flex items-center gap-1 font-medium hover:text-slate-900"
      onClick={() => onSort(field, nextOrder)}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <span className="text-slate-400">
        {isActive ? (currentOrder === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

export function OutagesPageClient() {
  const { state, actions } = useOutagesTableState();
  const { presets, savePreset, deletePreset } = useFilterPresets();
  const { data, isLoading, isError, refetch } = useOutages(state);
  const totalItems = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / state.page_size));
  const [presetName, setPresetName] = useState("");

  // Column visibility (persisted)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    loadFromStorage(VISIBILITY_KEY, DEFAULT_VISIBILITY)
  );

  // Density (persisted)
  const [density, setDensity] = useState<TableDensity>(() =>
    loadFromStorage<TableDensity>(DENSITY_KEY, "default")
  );

  // Delete confirmation state
  const [pendingDelete, setPendingDelete] = useState<Outage | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
    const { state, actions } = useOutagesTableState();
    const { presets, savePreset, deletePreset } = useFilterPresets();

    // Build sort param for API: "field:order"
    const sortParam = state.sort_field
      ? `${state.sort_field}:${state.sort_order}`
      : undefined;

    const { data, isLoading, isError } = useOutages({
      page: state.page,
      page_size: state.page_size,
      severity: state.severity,
      status: state.status,
      search: state.search,
      sort: sortParam,
    });

    const totalItems = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / state.page_size));
    const [presetName, setPresetName] = useState("");
    const [searchInput, setSearchInput] = useState(state.search ?? "");

    const columns: ColumnDef<Outage>[] = [
      {
        accessorKey: "id",
        header: () => (
          <SortHeader
            label="Outage"
            field="detected_at"
            currentField={state.sort_field}
            currentOrder={state.sort_order}
            onSort={actions.setSort}
          />
        ),
        cell: ({ row }) => (
          <Link
            href={`/outages/${row.original.id}`}
            className="font-medium text-blue-600 underline-offset-4 hover:underline"
          >
            {row.original.id}
          </Link>
        ),
      },
      {
        accessorKey: "site_name",
        header: "Site",
      },
      {
        accessorKey: "severity",
        header: () => (
          <SortHeader
            label="Severity"
            field="severity"
            currentField={state.sort_field}
            currentOrder={state.sort_order}
            onSort={actions.setSort}
          />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.severity === "critical" ? "destructive" : "secondary"}>
            {row.original.severity}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <SortHeader
            label="Status"
            field="status"
            currentField={state.sort_field}
            currentOrder={state.sort_order}
            onSort={actions.setSort}
          />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.status === "resolved" ? "secondary" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "detected_at",
        header: () => (
          <SortHeader
            label="Detected"
            field="detected_at"
            currentField={state.sort_field}
            currentOrder={state.sort_order}
            onSort={actions.setSort}
          />
        ),
        cell: ({ row }) => new Date(row.original.detected_at).toLocaleString(),
      },
      {
        accessorKey: "affected_services",
        header: "Services",
        cell: ({ row }) => row.original.affected_services.join(", "),
      },
    ];

    if (isLoading) {
        return (
            <RouteLoadingState
                title="Loading outages"
                description="Gathering the latest incidents and applying your saved filters."
            />
        );
    }

  useEffect(() => {
    localStorage.setItem(VISIBILITY_KEY, JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, JSON.stringify(density));
  }, [density]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteOutage(pendingDelete.id);
      setPendingDelete(null);
      await refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Deletion failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, refetch]);

  const columns: ColumnDef<Outage>[] = [
    {
      accessorKey: "id",
      header: "Outage",
      cell: ({ row }) => (
        <Link
          href={`/outages/${row.original.id}`}
          className="font-medium text-blue-600 underline-offset-4 hover:underline"
        >
          {row.original.id}
        </Link>
      ),
    },
    {
      accessorKey: "site_name",
      header: "Site",
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => (
        <Badge variant={row.original.severity === "critical" ? "destructive" : "secondary"}>
          {row.original.severity}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "resolved" ? "secondary" : "outline"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "detected_at",
      header: "Detected",
      cell: ({ row }) => new Date(row.original.detected_at).toLocaleString(),
    },
    {
      accessorKey: "affected_services",
      header: "Services",
      cell: ({ row }) => row.original.affected_services.join(", "),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <button
          onClick={() => { setPendingDelete(row.original); setDeleteError(null); }}
          className="rounded px-2 py-1 text-xs text-red-600 border border-red-200 hover:bg-red-50"
          aria-label={`Delete outage ${row.original.id}`}
        >
          Delete
        </button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <RouteLoadingState
        title="Loading outages"
        description="Gathering the latest incidents and applying your saved filters."
      />
    );
  }

  if (isError) {
    return (
      <RouteErrorState
        title="Outages unavailable"
        description="We could not load the outage feed right now."
        actionLabel="Reload page"
        onAction={() => window.location.reload()}
      />
    );
  }

  const outages: Outage[] = data?.items ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Outages</h1>
        <p className="text-sm text-slate-500">
          Review live incidents, filter by severity and status, and page through the active outage feed.
        </p>
      </div>

      <div className="flex justify-end">
        <ExportDropdown
          filters={{
            severity: state.severity,
            status: state.status,
          }}
        />
      </div>

      {/* Filter presets */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Presets:</span>
        {presets.map((preset) => (
          <div key={preset.name} className="flex items-center gap-1">
            <button
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => {
                actions.setSeverity(preset.severity);
                actions.setStatus(preset.status);
              }}
            >
              {preset.name}
            </button>
            <button
              className="text-slate-400 hover:text-red-500 text-xs"
              onClick={() => deletePreset(preset.name)}
              aria-label={`Delete preset ${preset.name}`}
            >
              ×
            </button>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input
            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
          <Button
            variant="outline"
            className="text-xs h-7 px-2"
            disabled={!presetName.trim()}
            onClick={() => {
              savePreset({ name: presetName.trim(), severity: state.severity, status: state.status });
              setPresetName("");
            }}
          >
            Save preset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Severity</span>
          <select
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={state.severity ?? ""}
            onChange={(event) => actions.setSeverity(event.target.value || undefined)}
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Status</span>
          <select
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={state.status ?? ""}
            onChange={(event) => actions.setStatus(event.target.value || undefined)}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Rows per page</span>
          <select
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={state.page_size}
            onChange={(event) => actions.setPageSize(Number(event.target.value))}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Result count
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalItems}</p>
          <p className="mt-1 text-sm text-slate-500">
            Page {state.page} of {totalPages}
          </p>
        </div>
      </div>

      {outages.length === 0 ? (
        <RouteEmptyState
          title="No outages found"
          description="Try widening your filters or lowering the severity restriction."
        />
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <DataTable
            columns={columns}
            data={outages}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            density={density}
            onDensityChange={setDensity}
          />

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {(state.page - 1) * state.page_size + 1}-
              {Math.min(state.page * state.page_size, totalItems)} of {totalItems}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => actions.setPage(state.page - 1)}
                disabled={state.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => actions.setPage(state.page + 1)}
                disabled={state.page >= totalPages}
              >
                Next
              </Button>
            {/* FE-058: Search bar */}
            <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    actions.setSearch(searchInput.trim() || undefined);
                }}
            >
                <input
                    type="search"
                    className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Search by site ID, site name, or outage ID…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    aria-label="Search outages"
                />
                <Button type="submit" variant="outline" className="text-sm">
                    Search
                </Button>
                {state.search && (
                    <Button
                        type="button"
                        variant="ghost"
                        className="text-sm text-slate-500"
                        onClick={() => {
                            setSearchInput("");
                            actions.setSearch(undefined);
                        }}
                    >
                        Clear
                    </Button>
                )}
            </form>

            {/* Filter presets */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Presets:</span>
                {presets.map((preset) => (
                    <div key={preset.name} className="flex items-center gap-1">
                        <button
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            onClick={() => {
                                actions.setSeverity(preset.severity);
                                actions.setStatus(preset.status);
                            }}
                        >
                            {preset.name}
                        </button>
                        <button
                            className="text-slate-400 hover:text-red-500 text-xs"
                            onClick={() => deletePreset(preset.name)}
                            aria-label={`Delete preset ${preset.name}`}
                        >
                            ×
                        </button>
                    </div>
                ))}
                <div className="ml-auto flex items-center gap-2">
                    <input
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                        placeholder="Preset name"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                    />
                    <Button
                        variant="outline"
                        className="text-xs h-7 px-2"
                        disabled={!presetName.trim()}
                        onClick={() => {
                            savePreset({ name: presetName.trim(), severity: state.severity, status: state.status });
                            setPresetName("");
                        }}
                    >
                        Save preset
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
                <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Severity</span>
                    <select
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={state.severity ?? ""}
                        onChange={(event) => actions.setSeverity(event.target.value || undefined)}
                    >
                        <option value="">All severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </label>

                <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Status</span>
                    <select
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={state.status ?? ""}
                        onChange={(event) => actions.setStatus(event.target.value || undefined)}
                    >
                        <option value="">All statuses</option>
                        <option value="open">Open</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </label>

                {/* FE-059: Sort controls */}
                <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Sort by</span>
                    <select
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={state.sort_field ?? ""}
                        onChange={(e) => {
                            const field = e.target.value as SortField;
                            if (field) {
                                actions.setSort(field, state.sort_order);
                            } else {
                                actions.clearSort();
                            }
                        }}
                    >
                        <option value="">Default order</option>
                        {SORT_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                </label>

                <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Sort direction</span>
                    <select
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={state.sort_order}
                        disabled={!state.sort_field}
                        onChange={(e) => {
                            if (state.sort_field) {
                                actions.setSort(state.sort_field, e.target.value as SortOrder);
                            }
                        }}
                    >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                    </select>
                </label>
            </div>

            <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
                <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Rows per page</span>
                    <select
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={state.page_size}
                        onChange={(event) => actions.setPageSize(Number(event.target.value))}
                    >
                        {[10, 20, 50].map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="rounded-lg bg-slate-50 p-4 md:col-start-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Result count
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{totalItems}</p>
                    <p className="mt-1 text-sm text-slate-500">
                        Page {state.page} of {totalPages}
                    </p>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-slate-900">
              Delete outage?
            </h2>
            <p className="text-sm text-slate-600">
              This will permanently delete outage{" "}
              <span className="font-medium">{pendingDelete.id}</span> (
              {pendingDelete.site_name}). This action cannot be undone.
            </p>
            {deleteError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {deleteError}{" "}
                <button
                  className="underline font-medium"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  Retry
                </button>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setPendingDelete(null); setDeleteError(null); }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
