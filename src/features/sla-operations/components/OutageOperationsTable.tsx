"use client";

import { useState } from "react";

export interface OutageOperationRow {
  id: string;
  service: string;
  severity: string;
  status: string;
  startedAt: string;
  durationMinutes: number;
}

type SortKey = keyof Omit<OutageOperationRow, "id">;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "service", label: "Service" },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" },
  { key: "startedAt", label: "Started" },
  { key: "durationMinutes", label: "Duration (min)" },
];

export interface OutageOperationsTableProps {
  rows: OutageOperationRow[];
  isLoading?: boolean;
  error?: string | null;
}

export function OutageOperationsTable({
  rows,
  isLoading = false,
  error = null,
}: OutageOperationsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("startedAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  if (isLoading) {
    return (
      <p role="status" aria-live="polite" className="p-4 text-sm text-gray-500">
        Loading outage operations...
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="p-4 text-sm text-red-600">
        {error}
      </p>
    );
  }
  if (rows.length === 0) {
    return <p className="p-4 text-sm text-gray-500">No outage operations found.</p>;
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
    return direction === "asc" ? cmp : -cmp;
  });

  const toggle = (key: SortKey) => {
    if (key === sortKey) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Outage operations</caption>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={
                  col.key === sortKey
                    ? direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className="px-3 py-2 font-medium"
              >
                <button type="button" onClick={() => toggle(col.key)}>
                  {col.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="border-t border-gray-200 dark:border-gray-800">
              <td className="px-3 py-2">{row.service}</td>
              <td className="px-3 py-2">{row.severity}</td>
              <td className="px-3 py-2">{row.status}</td>
              <td className="px-3 py-2">{row.startedAt}</td>
              <td className="px-3 py-2">{row.durationMinutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default OutageOperationsTable;
