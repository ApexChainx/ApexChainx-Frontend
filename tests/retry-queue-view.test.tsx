/** ApexChain Frontend Test Suite */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RetryQueueView from "@/components/payments/retry-queue-view";
import type { Payment } from "@/types/payment";

/**
 * RetryQueueView reads/writes through React Query (useRetryQueue), so it needs
 * a provider. Retries are disabled so a rejected mock settles immediately.
 */
function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RetryQueueView />
    </QueryClientProvider>,
  );
}

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

    renderView();
    expect(await screen.findByText("failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    // Optimistic pending lands before the request settles.
    expect(await screen.findByText("pending")).toBeInTheDocument();
    expect(screen.queryByText("failed")).not.toBeInTheDocument();

    // In-flight rows deactivate their controls.
    const inFlightButton = screen.getByRole("button", { name: "Retrying..." });
    expect(inFlightButton).toBeDisabled();

    // Reconcile with the server response.
    // `resolveRetry` is only assigned once the mutation actually invokes the
    // service, which happens after `onMutate`'s cancelQueries settles. Wait for
    // that before resolving, or the settle is a no-op.
    await waitFor(() => expect(mockRetryPayment).toHaveBeenCalledTimes(1));

    mockFetchPayments.mockResolvedValue({ items: [], total: 0 });
    await act(async () => {
      resolveRetry({ ...failedPayment, status: "pending" });
    });

    // Settling the mutation invalidates the payments family, which refetches
    // and leaves the queue empty.
    await waitFor(() => expect(mockFetchPayments).toHaveBeenCalledTimes(2));
    // RouteEmptyState also announces the title via a sr-only live region, so
    // assert on the visible heading rather than raw text.
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "No failed payments" })).toBeInTheDocument(),
    );
  });

  it("issues a single request when retry is double-clicked", async () => {
    mockFetchPayments.mockResolvedValue({ items: [failedPayment], total: 1 });
    mockRetryPayment.mockImplementation(() => new Promise<Payment>(() => {}));

    renderView();
    await screen.findByText("failed");

    const retryButton = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);

    // The mutation runs a tick after the click, so the assertion must await.
    await waitFor(() => expect(mockRetryPayment).toHaveBeenCalledTimes(1));
  });

  it("reverts the optimistic state and surfaces an error when the retry fails", async () => {
    mockFetchPayments.mockResolvedValue({ items: [failedPayment], total: 1 });
    mockRetryPayment.mockRejectedValue(new Error("network down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    renderView();
    await screen.findByText("failed");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not retry payment p1");
    // Falls back to the server state instead of leaving the row stuck on pending.
    await waitFor(() => expect(screen.getByText("failed")).toBeInTheDocument());

    consoleError.mockRestore();
  });
});
