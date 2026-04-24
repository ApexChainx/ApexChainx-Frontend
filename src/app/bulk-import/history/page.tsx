"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchBulkImportHistory } from "@/services/bulkImportService";
import type { BulkImportRecord } from "@/types/bulkImport";

export default function BulkImportHistoryPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: records = [], isLoading, isError } = useQuery({
    queryKey: ["bulk-import-history"],
    queryFn: fetchBulkImportHistory,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Import History</h1>
          <p className="text-sm text-gray-500">Previous bulk import attempts and their outcomes.</p>
        </div>
        <Link
          href="/bulk-import"
          className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← New import
        </Link>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading history…</p>}
      {isError && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          Failed to load import history.
        </p>
      )}

      {!isLoading && !isError && records.length === 0 && (
        <p className="text-sm text-gray-400">No import history yet.</p>
      )}

      <div className="space-y-3">
        {records.map((record: BulkImportRecord) => (
          <div key={record.id} className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{record.filename}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(record.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex gap-3 text-xs">
                  <span className="text-green-600 font-medium">{record.imported} imported</span>
                  <span className="text-yellow-600 font-medium">{record.skipped} skipped</span>
                  {record.error_count > 0 && (
                    <span className="text-red-600 font-medium">{record.error_count} errors</span>
                  )}
                </div>
                {record.error_count > 0 && (
                  <button
                    onClick={() => setExpanded(expanded === record.id ? null : record.id)}
                    className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {expanded === record.id ? "Hide errors" : "View errors"}
                  </button>
                )}
              </div>
            </div>

            {expanded === record.id && record.errors.length > 0 && (
              <div className="border-t px-4 pb-4 pt-3">
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-red-50 p-3">
                  {record.errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-700">
                      {err.row != null && <span className="font-semibold">Row {err.row}: </span>}
                      {err.field && <span className="font-semibold">[{err.field}] </span>}
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
