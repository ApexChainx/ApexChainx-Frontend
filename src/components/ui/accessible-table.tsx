/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useCallback, useRef, KeyboardEvent } from "react";

interface AccessibleTableProps {
  children: React.ReactNode;
  className?: string;
}

export function AccessibleTable({ children, className }: AccessibleTableProps) {
  return (
    <div className={`overflow-x-auto ${className ?? ""}`} role="region" aria-label="Data table" tabIndex={0}>
      <table className="min-w-full divide-y divide-gray-200">{children}</table>
    </div>
  );
}

interface AccessibleTableHeadProps {
  children: React.ReactNode;
}

export function AccessibleTableHead({ children }: AccessibleTableHeadProps) {
  return <thead className="bg-gray-50">{children}</thead>;
}

interface AccessibleTableHeaderCellProps {
  children: React.ReactNode;
  sortable?: boolean;
  sortDirection?: "asc" | "desc";
  onSort?: () => void;
}

export function AccessibleTableHeaderCell({
  children,
  sortable,
  sortDirection,
  onSort,
}: AccessibleTableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${sortable ? "cursor-pointer select-none" : ""}`}
      {...(sortable && { tabIndex: 0, role: "columnheader", "aria-sort": sortDirection === "asc" ? "ascending" : sortDirection === "desc" ? "descending" : "none" })}
      onClick={sortable ? onSort : undefined}
      onKeyDown={sortable ? (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSort?.(); } } : undefined}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortable && sortDirection && (
          <span aria-hidden="true">{sortDirection === "asc" ? "▲" : "▼"}</span>
        )}
      </span>
    </th>
  );
}

interface AccessibleTableBodyProps {
  children: React.ReactNode;
}

export function AccessibleTableBody({ children }: AccessibleTableBodyProps) {
  return <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>;
}

interface AccessibleTableRowProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export function AccessibleTableRow({ children, onClick }: AccessibleTableRowProps) {
  return (
    <tr
      className={onClick ? "cursor-pointer hover:bg-gray-50" : ""}
      onClick={onClick}
      {...(onClick && { tabIndex: 0, role: "row" })}
      onKeyDown={onClick ? (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      {children}
    </tr>
  );
}
