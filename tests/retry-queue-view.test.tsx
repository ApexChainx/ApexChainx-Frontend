/** ApexChain Frontend Test Suite */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RetryQueueView from "@/components/payments/retry-queue-view";
import type { Payment } from "@/types/payment";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const mockFetchPayments = vi.fn();
const mockRetryPayment = vi.fn();

vi.mock("@/services/paymentService", () => ({
  fetchPayments: (...a: unknown[]) => mockFetchPayments(...a),
  retryPayment: (...a: unknown[]) => mockRetryPayment(...a),
}));

const failedPayment: Payment = {
  id: "p1",
  outage_id: "o1",
  type: "reward",
  amount: 200,
  asset_code: "USDC",
  from_address: "GA",
  to_address: "GB",
  transaction_hash: "tx1",
  status: "failed",
  created_at: "2026-01-01T00:00:00Z",
  confirmed_at: null,
};

describe("RetryQueueView optimistic retry", () => {
  beforeEach(() => {
    mockFetchPayments.mockReset();
    mockRetryPayment.mockReset();
  });

  it("flips the row to pending and disables the control while the retry is in flight", async () => {
    let resolveRetry: (value: Payment) => void = () => {};
    mockFetchPayments.mockResolvedValue({ items: [failedPayment], total: 1 });
    mockRetryPayment.mockImplementation(
      () => new Promise<Payment>((resolve) => { resolveRetry = resolve; }),
    );

    render(<RetryQueueView />);
    expect(await screen.findByText("failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    // Optimistic pending lands before the request settles.
    expect(await screen.findByText("pending")).toBeInTheDocument();
    expect(screen.queryByText("failed")).not.toBeInTheDocument();

    // In-flight rows deactivate their controls.
    const inFlightButton = screen.getByRole("button", { name: "Retrying..." });
    expect(inFlightButton).toBeDisabled();

    // Reconcile with the server response.
    mockFetchPayments.mockResolvedValue({ items: [], total: 0 });
    resolveRetry({ ...failedPayment, status: "pending" });

    // RouteEmptyState also announces the title via a sr-only live region, so
    // assert on the visible heading rather than raw text.
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "No failed payments" })).toBeInTheDocument(),
    );
  });

  it("issues a single request when retry is double-clicked", async () => {
    mockFetchPayments.mockResolvedValue({ items: [failedPayment], total: 1 });
    mockRetryPayment.mockImplementation(() => new Promise<Payment>(() => {}));

    render(<RetryQueueView />);
    await screen.findByText("failed");

    const retryButton = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);

    expect(mockRetryPayment).toHaveBeenCalledTimes(1);
  });

  it("reverts the optimistic state and surfaces an error when the retry fails", async () => {
    mockFetchPayments.mockResolvedValue({ items: [failedPayment], total: 1 });
    mockRetryPayment.mockRejectedValue(new Error("network down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<RetryQueueView />);
    await screen.findByText("failed");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not retry payment p1");
    // Falls back to the server state instead of leaving the row stuck on pending.
    await waitFor(() => expect(screen.getByText("failed")).toBeInTheDocument());

    consoleError.mockRestore();
  });
});
