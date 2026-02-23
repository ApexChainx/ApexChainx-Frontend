import React, { useEffect, useState } from "react";
import { fetchPayments } from "../services/paymentService";
import { Payment, PaginatedPayments } from "../types/payment";

const PER_PAGE = 10;

const statusStyles: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  disputed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const typeStyles: Record<string, string> = {
  reward: "bg-blue-100 text-blue-700",
  penalty: "bg-red-100 text-red-700",
};

const PaymentsPage: React.FC = () => {
  const [data, setData] = useState<PaginatedPayments | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPayments(page, PER_PAGE)
      .then(setData)
      .catch(() => setError("Failed to load payments."))
      .finally(() => setLoading(false));
  }, [page]);

  const renderBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={5} className="py-16 text-center text-gray-400">
            Loading...
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={5} className="py-16 text-center text-red-500">
            {error}
          </td>
        </tr>
      );
    }

    if (!data || data.data.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="py-16 text-center text-gray-400">
            No payments found.
          </td>
        </tr>
      );
    }

    return data.data.map((payment: Payment) => (
      <tr key={payment.id} className="border-t hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm text-gray-700 font-mono">
          {payment.outage_id}
        </td>
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
          {new Date(payment.date).toLocaleDateString()}
        </td>
        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[payment.status]}`}
          >
            {payment.status}
          </span>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold text-gray-800">Payments</h1>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              {["Outage ID", "Type", "Amount", "Date", "Status"].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{renderBody()}</tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {data.page} of {data.total_pages} &mdash; {data.total} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page === data.total_pages}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
