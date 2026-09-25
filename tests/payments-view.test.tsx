/** ApexChain Frontend Test Suite */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PaymentsView from "@/components/payments/payments-view";
import { PaymentDetailDrawer } from "@/components/payments/payment-detail-drawer";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => vi.fn() }));

const mockFetchPayments = vi.fn();
const mockFetchPayment = vi.fn();
vi.mock("@/services/paymentService", () => ({
  fetchPayments: (...a: unknown[]) => mockFetchPayments(...a),
  fetchPayment: (...a: unknown[]) => mockFetchPayment(...a),
  exportPayments: vi.fn(),
  retryPayment: vi.fn(),
  reconcilePayment: vi.fn(),
}));

const payment = {
  id: "p1", outage_id: "o1", type: "reward", amount: 200, status: "completed",
  asset_code: "USDC", from_address: "GA", to_address: "GB",
  transaction_hash: "tx1", created_at: "2026-01-01T00:00:00Z", confirmed_at: null,
};

// The detail drawer reads through react-query now, so a client must be in scope.
function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("PaymentsView", () => {
  beforeEach(() => { mockFetchPayments.mockReset(); mockFetchPayment.mockReset(); });

  it("renders payment list", async () => {
    mockFetchPayments.mockResolvedValue({ items: [payment], total: 1 });
    renderWithQueryClient(<PaymentsView />);
    expect(await screen.findByText("reward")).toBeInTheDocument();
    expect(screen.getByText("+$200")).toBeInTheDocument();
  });

  it("passes default sort parameters to the API", async () => {
    mockFetchPayments.mockResolvedValue({ items: [payment], total: 1 });
    renderWithQueryClient(<PaymentsView />);
    await screen.findByText("reward");
    const callArgs = mockFetchPayments.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArgs?.sort_by).toBe("created_at");
    expect(callArgs?.sort_dir).toBe("desc");
  });

  it("re-fetches when sort column changes", async () => {
    mockFetchPayments.mockResolvedValue({ items: [payment], total: 1 });
    renderWithQueryClient(<PaymentsView />);
    await screen.findByText("reward");

    // Click Amount header to change sort
    fireEvent.click(screen.getByText("Amount"));
    await screen.findByText("reward");

    expect(mockFetchPayments).toHaveBeenCalledTimes(2);
    const secondCall = mockFetchPayments.mock.calls[1]?.[0] as Record<string, unknown> | undefined;
    expect(secondCall?.sort_by).toBe("amount");
    expect(secondCall?.sort_dir).toBe("asc");
  });

  it("shows empty state", async () => {
    mockFetchPayments.mockResolvedValue({ items: [], total: 0 });
    renderWithQueryClient(<PaymentsView />);
    // RouteEmptyState renders the title twice (visual heading + screen-
    // reader Announcer), so assert on the heading role instead of raw text.
    expect(
      await screen.findAllByText("No payments found"),
    ).toHaveLength(2);
  });

  it("shows error state on failure", async () => {
    mockFetchPayments.mockRejectedValue(new Error("fail"));
    renderWithQueryClient(<PaymentsView />);
    // RouteErrorState also renders the title via its Announcer.
    expect(await screen.findAllByText("Payments unavailable")).toHaveLength(2);
  });
});

describe("PaymentDetailDrawer", () => {
  it("renders nothing when paymentId is null", () => {
    const { container } = renderWithQueryClient(
      <PaymentDetailDrawer paymentId={null} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("opens drawer and shows details", async () => {
    mockFetchPayment.mockResolvedValue(payment);
    renderWithQueryClient(<PaymentDetailDrawer paymentId="p1" onClose={vi.fn()} />);
    expect(await screen.findByText("Payment Details")).toBeInTheDocument();
    expect(await screen.findByText("p1")).toBeInTheDocument();
  });
});
