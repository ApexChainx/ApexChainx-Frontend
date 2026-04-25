import { render, screen } from "@testing-library/react";
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

describe("PaymentsView", () => {
  beforeEach(() => { mockFetchPayments.mockReset(); mockFetchPayment.mockReset(); });

  it("renders payment list", async () => {
    mockFetchPayments.mockResolvedValue({ items: [payment], total: 1 });
    render(<PaymentsView />);
    expect(await screen.findByText("reward")).toBeInTheDocument();
    expect(screen.getByText("+$200")).toBeInTheDocument();
  });

  it("shows empty state", async () => {
    mockFetchPayments.mockResolvedValue({ items: [], total: 0 });
    render(<PaymentsView />);
    expect(await screen.findByText("No payments found")).toBeInTheDocument();
  });

  it("shows error state on failure", async () => {
    mockFetchPayments.mockRejectedValue(new Error("fail"));
    render(<PaymentsView />);
    expect(await screen.findByText("Payments unavailable")).toBeInTheDocument();
  });
});

describe("PaymentDetailDrawer", () => {
  it("renders nothing when paymentId is null", () => {
    const { container } = render(<PaymentDetailDrawer paymentId={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("opens drawer and shows details", async () => {
    mockFetchPayment.mockResolvedValue(payment);
    render(<PaymentDetailDrawer paymentId="p1" onClose={vi.fn()} />);
    expect(await screen.findByText("Payment Details")).toBeInTheDocument();
    expect(await screen.findByText("p1")).toBeInTheDocument();
  });
});
