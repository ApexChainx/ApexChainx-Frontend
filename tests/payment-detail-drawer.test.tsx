/** ApexChain Network Operations Intelligence Platform */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentDetailDrawer } from "@/components/payments/payment-detail-drawer";
import type { Payment } from "@/types/payment";

vi.mock("@/components/ui/toast", () => ({
  // The drawer calls toast(message, kind) after retry/reconcile actions.
  useToast: () => vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const mockFetchPayment = vi.fn();
const mockRetryPayment = vi.fn();
const mockReconcilePayment = vi.fn();

vi.mock("@/services/paymentService", () => ({
  fetchPayment: (...a: unknown[]) => mockFetchPayment(...a),
  retryPayment: (...a: unknown[]) => mockRetryPayment(...a),
  reconcilePayment: (...a: unknown[]) => mockReconcilePayment(...a),
}));

function makePayment(id: string): Payment {
  return {
    id,
    outage_id: "o1",
    type: "reward",
    amount: 200,
    asset_code: "USDC",
    from_address: "GA",
    to_address: "GB",
    transaction_hash: "tx1",
    status: "completed",
    created_at: "2026-01-01T00:00:00Z",
    confirmed_at: null,
  };
}

// The detail read is a query now, so every render needs a client in scope.
function withClient(ui: React.ReactElement, client: QueryClient) {
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("PaymentDetailDrawer", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when paymentId is null", () => {
    render(withClient(<PaymentDetailDrawer paymentId={null} onClose={mockOnClose} />, newClient()));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    mockFetchPayment.mockResolvedValue(makePayment("123"));

    render(withClient(<PaymentDetailDrawer paymentId="123" onClose={mockOnClose} />, newClient()));

    const closeButton = screen.getByLabelText("Close drawer");
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onClose when escape key is pressed", () => {
    mockFetchPayment.mockResolvedValue(makePayment("123"));

    render(withClient(<PaymentDetailDrawer paymentId="123" onClose={mockOnClose} />, newClient()));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("reuses the cached payload when the same payment is reopened", async () => {
    mockFetchPayment.mockImplementation((id: string) => Promise.resolve(makePayment(id)));
    const client = newClient();

    const { rerender } = render(
      withClient(<PaymentDetailDrawer paymentId="p1" onClose={mockOnClose} />, client),
    );
    expect(await screen.findByText("p1")).toBeInTheDocument();

    rerender(withClient(<PaymentDetailDrawer paymentId="p2" onClose={mockOnClose} />, client));
    expect(await screen.findByText("p2")).toBeInTheDocument();

    // Reopening row A must render instantly from cache, with no third detail request.
    rerender(withClient(<PaymentDetailDrawer paymentId="p1" onClose={mockOnClose} />, client));
    expect(screen.getByText("p1")).toBeInTheDocument();
    expect(mockFetchPayment).toHaveBeenCalledTimes(2);
  });
});
