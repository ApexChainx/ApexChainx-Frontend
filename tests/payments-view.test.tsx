/** ApexChain Frontend Test Suite */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("passes default sort parameters to the API", async () => {
    mockFetchPayments.mockResolvedValue({ items: [payment], total: 1 });
    render(<PaymentsView />);
    await screen.findByText("reward");
    const callArgs = mockFetchPayments.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArgs?.sort_by).toBe("created_at");
    expect(callArgs?.sort_dir).toBe("desc");
  });

  it("re-fetches when sort column changes", async () => {
    mockFetchPayments.mockResolvedValue({ items: [payment], total: 1 });
    render(<PaymentsView />);
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
    render(<PaymentsView />);
    expect(await screen.findByText("No payments found")).toBeInTheDocument();
  });

  it("shows error state on failure", async () => {
    mockFetchPayments.mockRejectedValue(new Error("fail"));
    render(<PaymentsView />);
    expect(await screen.findByText("Payments unavailable")).toBeInTheDocument();
  });

  it("flags a reversed date range and blocks the fetch", async () => {
    mockFetchPayments.mockResolvedValue({ items: [payment], total: 1 });
    render(<PaymentsView />);
    await screen.findByText("reward");

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-08-10" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-08-01" } });

    // Inline flag is shown and the input is marked invalid
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /From date must be on or before the To date/i
    );
    expect(screen.getByLabelText("From")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("To")).toHaveAttribute("aria-invalid", "true");

    // The reversed range is never submitted to the backend. (A single-ended
    // "From only" fetch before both fields were set is legitimate; only the
    // invalid From > To pair must be blocked.)
    await waitFor(() => {
      const invalid = mockFetchPayments.mock.calls.some(([args]) => {
        const a = args as Record<string, unknown>;
        return a?.date_from && a?.date_to && String(a.date_from) > String(a.date_to);
      });
      expect(invalid).toBe(false);
    });
  });

  it("accepts equal date bounds and submits them", async () => {
    mockFetchPayments.mockResolvedValue({ items: [payment], total: 1 });
    render(<PaymentsView />);
    await screen.findByText("reward");
    mockFetchPayments.mockClear();

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-08-01" } });

    await waitFor(() => {
      const last = mockFetchPayments.mock.calls[mockFetchPayments.mock.calls.length - 1]?.[0] as Record<string, unknown> | undefined;
      expect(last?.date_from).toBe("2026-08-01");
      expect(last?.date_to).toBe("2026-08-01");
    });
  });

  it("disables export while the date range is invalid", async () => {
    mockFetchPayments.mockResolvedValue({ items: [payment], total: 1 });
    render(<PaymentsView />);
    await screen.findByText("reward");

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-08-10" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-08-01" } });

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeDisabled();
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
