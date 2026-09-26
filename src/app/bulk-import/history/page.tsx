"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchBulkImportHistory } from "@/services/bulkImportService";
import type { BulkImportRecord } from "@/types/bulkImport";

// Records rendered per history page. The full list is fetched once; paging is
// client-side so the DOM stays bounded for long histories (issue #611).
const PAGE_SIZE = 10;
// How many numbered page buttons to show around the current page.
const PAGE_BUTTON_WINDOW = 5;
// The summary strip aggregates this many most-recent runs.
const SUMMARY_RUN_WINDOW = 5;

/** Page numbers to render around the current page (windowed). */
function getPageWindow(currentPage: number, pageCount: number): number[] {
  let start = Math.max(0, currentPage - Math.floor(PAGE_BUTTON_WINDOW / 2));
  const end = Math.min(pageCount, start + PAGE_BUTTON_WINDOW);
  start = Math.max(0, end - PAGE_BUTTON_WINDOW);
  return Array.from({ length: end - start }, (_, i) => start + i);
}

/**
 * Aggregate success rate across the most recent runs: imported rows over all
 * attempted rows (imported + skipped + errors). Returns null when there is
 * nothing to report so the strip can be hidden for empty histories.
 */
function summarizeRecentSuccessRate(records: BulkImportRecord[]): {
  rate: number;
  attempted: number;
  runs: number;
} | null {
  const recent = records.slice(0, SUMMARY_RUN_WINDOW);
  if (recent.length === 0) return null;

  const attempted = recent.reduce(
    (sum, r) => sum + r.imported + r.skipped + r.error_count,
    0
  );
  if (attempted === 0) return null;

  const imported = recent.reduce((sum, r) => sum + r.imported, 0);
  return {
    rate: Math.round((imported / attempted) * 100),
    attempted,
    runs: recent.length,
  };
}

/** Tailwind classes for the failure-rate badge, keyed by severity band. */
function failureBadgeClasses(rate: number): string {
  if (rate === 0) return "bg-green-100 text-green-700";
  if (rate <= 0.25) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export default function BulkImportHistoryPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data: records = [], isLoading, isError } = useQuery({
    queryKey: ["bulk-import-history"],
    queryFn: fetchBulkImportHistory,
  });

  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRecords = records.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const summary = summarizeRecentSuccessRate(records);

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

      {/* Recent success-rate summary strip (issue #611) */}
      {summary && (
        <div
          data-testid="history-summary"
          className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 shadow-sm"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Recent success rate
            </p>
            <p className="text-xs text-gray-400">
              {summary.runs} recent import{summary.runs > 1 ? "s" : ""} · {summary.attempted} rows attempted
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${failureBadgeClasses(
              1 - summary.rate / 100
            )}`}
          >
            {summary.rate}%
          </span>
        </div>
      )}

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
        {pageRecords.map((record: BulkImportRecord) => {
          const attempted = record.imported + record.skipped + record.error_count;
          const failureRate = attempted > 0 ? (record.skipped + record.error_count) / attempted : 0;

          return (
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
                  {/* Failure-rate badge per run (issue #611) */}
                  <span
                    title={`${Math.round(failureRate * 100)}% of attempted rows did not import`}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${failureBadgeClasses(failureRate)}`}
                  >
                    {Math.round(failureRate * 100)}% failures
                  </span>
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
          );
        })}
      </div>

      {/* Pagination controls (issue #611) */}
      {!isLoading && !isError && pageCount > 1 && (
        <nav
          aria-label="History pagination"
          className="flex items-center justify-between rounded-lg border bg-white px-4 py-2 shadow-sm"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>
          <div className="flex items-center gap-1">
            {getPageWindow(safePage, pageCount).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === safePage ? "page" : undefined}
                aria-label={`Page ${p + 1}`}
                className={`h-6 min-w-[1.5rem] rounded px-1 text-xs transition-colors ${
                  p === safePage
                    ? "bg-blue-600 font-semibold text-white"
                    : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p + 1}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage === pageCount - 1}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}
