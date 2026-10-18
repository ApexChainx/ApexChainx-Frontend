"use client";
/** ApexChain Network Operations Intelligence Platform */

import Link from "next/link";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { TableDensity } from "@/components/data-table";
import { RouteEmptyState, RouteErrorState, RouteLoadingState } from "@/components/ui/route-state";
import type { Payment } from "@/types/payment";

export type SortKey = "created_at" | "amount" | "status";
export type SortDir = "asc" | "desc";

/** Above this row count the table switches to windowed rendering. */
export const PAYMENTS_VIRTUALIZATION_THRESHOLD = 100;
const OVERSCAN = 10;

const ROW_ESTIMATED_HEIGHT: Record<"default" | "compact", number> = {
  compact: 32,
  default: 48,
};

const COLUMN_COUNT = 6;

const statusStyles: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  confirmed: "bg-emerald-100 text-emerald-700",
};

const typeStyles: Record<string, string> = {
  reward: "bg-blue-100 text-blue-700",
  penalty: "bg-red-100 text-red-700",
};

export function shouldVirtualizePayments(
  rowCount: number,
  threshold: number = PAYMENTS_VIRTUALIZATION_THRESHOLD,
) {
  return rowCount > threshold;
}

function SortIndicator({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== column) return <span className="ml-1 text-gray-300" aria-hidden="true">↕</span>;
  return (
    <span className="ml-1" aria-hidden="true">
      {sortDir === "asc" ? "↑" : "↓"}
    </span>
  );
}

function ariaSortValue(column: SortKey, sortKey: SortKey, sortDir: SortDir) {
  if (sortKey !== column) return "none" as const;
  return sortDir === "asc" ? ("ascending" as const) : ("descending" as const);
}

function SortableHeader({
  column,
  label,
  cell,
  width,
  sortKey,
  sortDir,
  onSort,
}: {
  column: SortKey;
  label: string;
  cell: string;
  width?: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th
      scope="col"
      className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500`}
      style={width ? { width } : undefined}
      aria-sort={ariaSortValue(column, sortKey, sortDir)}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="cursor-pointer select-none rounded font-semibold uppercase tracking-wide hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span>{label}</span>
        <SortIndicator column={column} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </th>
  );
}

function PaymentCells({ payment, cell, width }: { payment: Payment; cell: string; width?: string }) {
  const style = width ? { width } : undefined;

  return (
    <>
      <td className={`${cell} font-mono text-gray-700`} style={style}>
        {payment.outage_id ? (
          <Link
            href={`/outages/${payment.outage_id}`}
            className="text-blue-600 hover:underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            {payment.outage_id}
          </Link>
        ) : (
          <span className="italic text-gray-400">—</span>
        )}
      </td>
      <td className={cell} style={style}>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${typeStyles[payment.type]}`}>
          {payment.type}
        </span>
      </td>
      <td className={`${cell} font-semibold ${payment.type === "penalty" ? "text-red-600" : "text-green-600"}`} style={style}>
        {payment.type === "penalty" ? "-" : "+"}${payment.amount.toLocaleString()}
      </td>
      <td className={`${cell} text-gray-600`} style={style}>
        {new Date(payment.created_at).toLocaleDateString()}
      </td>
      <td className={`${cell} font-mono text-gray-500`} style={style}>{payment.asset_code}</td>
      <td className={cell} style={style}>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[payment.status] ?? "bg-gray-100 text-gray-500"}`}>
          {payment.status}
        </span>
      </td>
    </>
  );
}

interface PaymentsTableProps {
  items: Payment[];
  density: TableDensity;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRowClick: (id: string) => void;
  loading: boolean;
  error: string | null;
  onReload: () => void;
}

export function PaymentsTable({
  items,
  density: requestedDensity,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  loading,
  error,
  onReload,
}: PaymentsTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const density = requestedDensity === "compact" ? "compact" : "default";
  const cell = density === "compact" ? "px-3 py-1.5 text-xs" : "px-4 py-3 text-sm";

  // Only window the DOM when we actually have a large page and something to show.
  const virtualize = shouldVirtualizePayments(items.length) && !loading && !error;
  const columnWidth = `${100 / COLUMN_COUNT}%`;

  const rowVirtualizer = useVirtualizer({
    count: virtualize ? items.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATED_HEIGHT[density],
    overscan: OVERSCAN,
    getItemKey: (index) => items[index]?.id ?? index,
  });

  const virtualRows = virtualize ? rowVirtualizer.getVirtualItems() : [];
  const totalSize = virtualize ? rowVirtualizer.getTotalSize() : 0;

  const headerRow = (
    <tr>
      <th
        scope="col"
        className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500`}
        style={virtualize ? { width: columnWidth } : undefined}
      >
        Outage
      </th>
      <th
        scope="col"
        className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500`}
        style={virtualize ? { width: columnWidth } : undefined}
      >
        Type
      </th>
      <SortableHeader
        column="amount"
        label="Amount"
        cell={cell}
        {...(virtualize ? { width: columnWidth } : {})}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      />
      <SortableHeader
        column="created_at"
        label="Date"
        cell={cell}
        {...(virtualize ? { width: columnWidth } : {})}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      />
      <th
        scope="col"
        className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500`}
        style={virtualize ? { width: columnWidth } : undefined}
      >
        Asset
      </th>
      <SortableHeader
        column="status"
        label="Status"
        cell={cell}
        {...(virtualize ? { width: columnWidth } : {})}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
      />
    </tr>
  );

  const statusRow = loading ? (
    <tr>
      <td colSpan={COLUMN_COUNT} className="p-0">
        <RouteLoadingState title="Loading payments" description="Retrieving the latest reward and penalty records." />
      </td>
    </tr>
  ) : error ? (
    <tr>
      <td colSpan={COLUMN_COUNT} className="p-0">
        <RouteErrorState
          title="Payments unavailable"
          description={error}
          primaryAction={{ label: "Reload page", onClick: onReload }}
        />
      </td>
    </tr>
  ) : items.length === 0 ? (
    <tr>
      <td colSpan={COLUMN_COUNT} className="p-0">
        <RouteEmptyState title="No payments found" description="Try adjusting your filters." />
      </td>
    </tr>
  ) : null;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm" data-tour="payments-table">
      <div
        ref={scrollRef}
        role="region"
        aria-label="Payments"
        tabIndex={0}
        aria-busy={loading}
        className={virtualize ? "max-h-[65vh] overflow-auto" : ""}
      >
        {virtualize ? (
          <table className="w-full text-left" style={{ tableLayout: "fixed" }}>
            <thead className="sticky top-0 z-10 bg-gray-50">{headerRow}</thead>
            <tbody style={{ display: "block", height: `${totalSize}px`, position: "relative" }}>
              {virtualRows.map((virtualRow) => {
                const payment = items[virtualRow.index];
                if (!payment) return null;

                return (
                  <tr
                    key={payment.id}
                    className="absolute left-0 right-0 w-full border-t transition-colors hover:bg-gray-50 cursor-pointer"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => onRowClick(payment.id)}
                  >
                    <PaymentCells payment={payment} cell={cell} width={columnWidth} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50">{headerRow}</thead>
            <tbody>
              {statusRow ??
                items.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-t transition-colors hover:bg-gray-50 cursor-pointer"
                    onClick={() => onRowClick(payment.id)}
                  >
                    <PaymentCells payment={payment} cell={cell} />
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
