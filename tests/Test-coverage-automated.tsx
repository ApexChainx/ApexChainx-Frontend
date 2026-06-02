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



describe("SLA config page", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPut.mockReset();
  });

  it("covers config load, validation, and save", async () => {
    mockGet.mockResolvedValue({
      data: {
        critical: {
          threshold_minutes: 30,
          penalty_per_minute: 10,
          reward_base: 150,
        },
        high: {
          threshold_minutes: 60,
          penalty_per_minute: 5,
          reward_base: 75,
        },
      },
    });
    mockPut.mockResolvedValue({
      data: {
        threshold_minutes: 45,
        penalty_per_minute: 10,
        reward_base: 200,
      },
    });

    render(<SlaConfigPage />);

    expect(await screen.findByText("Severity Service Level Agreements")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith("/sla/config");
    expect(screen.getByText("critical")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    const thresholdInput = screen.getByLabelText("Threshold (minutes)");
    const rewardInput = screen.getByLabelText("Reward Base");

    fireEvent.change(rewardInput, { target: { value: "-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Values cannot be negative.")).toBeInTheDocument();
    expect(mockPut).not.toHaveBeenCalled();

    fireEvent.change(thresholdInput, { target: { value: "45" } });
    fireEvent.change(rewardInput, { target: { value: "200" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith("/sla/config/critical", {
        threshold_minutes: 45,
        penalty_per_minute: 10,
        reward_base: 200,
      });
    });

    expect(await screen.findByText("45")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });
});

