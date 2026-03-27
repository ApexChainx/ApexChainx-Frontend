"use client";

import Link from "next/link";

import { DataTable } from "@/components/data-table";
import ExportDropdown from "@/components/outages/ExportDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOutages } from "@/features/outages/hooks/useOutages";
import { useOutagesTableState } from "@/hooks/useOutagesTableState";
import type { Outage } from "@/types/outages";
import type { ColumnDef } from "@tanstack/react-table";

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
];

export function OutagesPageClient() {
    const { state, actions } = useOutagesTableState();
    const { data, isLoading, isError } = useOutages(state);
    const totalItems = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / state.page_size));

    if (isLoading) {
        return <div className="p-6 text-sm text-slate-500">Loading outages...</div>;
    }

    if (isError) {
        return <div className="p-6 text-sm text-red-600">Error loading outages</div>;
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
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                    No outages found for the selected filters.
                </div>
            ) : (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <DataTable columns={columns} data={outages} />

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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
