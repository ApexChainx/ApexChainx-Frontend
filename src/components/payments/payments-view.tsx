"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchPayments } from "@/services/paymentService";
import type { PaginatedPayments, Payment } from "@/types/payment";

const PER_PAGE = 10;

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

export default function PaymentsView() {
  const [data, setData] = useState<PaginatedPayments | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestKey = useMemo(() => `${page}:${PER_PAGE}`, [page]);

  useEffect(() => {
    let isMounted = true;

    fetchPayments(page, PER_PAGE)
      .then((response) => {
        if (isMounted) {
          setData(response);
          setError(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Failed to load payments.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [requestKey, page]);

  function goToPreviousPage() {
    setLoading(true);
    setError(null);
    setPage((currentPage) => Math.max(1, currentPage - 1));
  }

  function goToNextPage() {
    if (!data) {
      return;
    }
    setLoading(true);
    setError(null);
    setPage((currentPage) => Math.min(Math.ceil(data.total / data.page_size), currentPage + 1));
  }

  function renderBody() {
    if (loading) {
      return (
        <tr>
          <td colSpan={6} className="py-16 text-center text-gray-400">
            Loading...
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={6} className="py-16 text-center text-red-500">
            {error}
          </td>
        </tr>
      );
    }

    if (!data || data.items.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="py-16 text-center text-gray-400">
            No payments found.
          </td>
        </tr>
      );
    }

    return data.items.map((payment: Payment) => (
      <tr key={payment.id} className="border-t transition-colors hover:bg-gray-50">
        <td className="px-4 py-3 text-sm font-mono text-gray-700">{payment.outage_id}</td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${typeStyles[payment.type]}`}
          >
            {payment.type}
          </span>
        </td>
        <td
          className={`px-4 py-3 text-sm font-semibold ${
            payment.type === "penalty" ? "text-red-600" : "text-green-600"
          }`}
        >
          {payment.type === "penalty" ? "-" : "+"}$
          {payment.amount.toLocaleString()}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {new Date(payment.created_at).toLocaleDateString()}
        </td>
        <td className="px-4 py-3 text-xs font-mono text-gray-500">{payment.asset_code}</td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
              statusStyles[payment.status] ?? "bg-gray-100 text-gray-500"
            }`}
          >
            {payment.status}
          </span>
        </td>
      </tr>
    ));
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold text-gray-800">Payments</h1>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              {["Outage ID", "Type", "Amount", "Date", "Asset", "Status"].map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{renderBody()}</tbody>
        </table>
      </div>

      {data && Math.ceil(data.total / data.page_size) > 1 ? (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {data.page} of {Math.ceil(data.total / data.page_size)} - {data.total} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousPage}
              disabled={page === 1}
              className="rounded-lg border px-3 py-1.5 transition-colors hover:bg-gray-100 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={goToNextPage}
              disabled={page === Math.ceil(data.total / data.page_size)}
              className="rounded-lg border px-3 py-1.5 transition-colors hover:bg-gray-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
