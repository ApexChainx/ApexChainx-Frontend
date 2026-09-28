/** ApexChain Frontend Test Suite */
/**
 * Issue #598 — webhook CRUD had no dedicated unit coverage, and issue #599
 * added a typed-phrase gate in front of the irreversible delete. These tests
 * pin the create contract (url + selected events reach the service), the
 * delete gate (nothing fires until the phrase is typed), and the failure path.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WebhooksPage from "@/app/webhooks/page";
import type { Webhook } from "@/types/webhook";

const mockFetchWebhooks = vi.fn();
const mockCreateWebhook = vi.fn();
const mockUpdateWebhook = vi.fn();
const mockDeleteWebhook = vi.fn();
const mockFetchDeliveries = vi.fn();
const mockRetryDelivery = vi.fn();

vi.mock("@/services/webhookService", () => ({
  fetchWebhooks: (...a: unknown[]) => mockFetchWebhooks(...a),
  createWebhook: (...a: unknown[]) => mockCreateWebhook(...a),
  updateWebhook: (...a: unknown[]) => mockUpdateWebhook(...a),
  deleteWebhook: (...a: unknown[]) => mockDeleteWebhook(...a),
  fetchWebhookDeliveries: (...a: unknown[]) => mockFetchDeliveries(...a),
  retryDelivery: (...a: unknown[]) => mockRetryDelivery(...a),
}));

const existing: Webhook = {
  id: "wh-1",
  url: "https://example.com/hook",
  events: ["outage.created"],
  active: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <WebhooksPage />
    </QueryClientProvider>,
  );
}

describe("WebhooksPage CRUD (#598)", () => {
  beforeEach(() => {
    mockFetchWebhooks.mockReset().mockResolvedValue([]);
    mockCreateWebhook.mockReset().mockResolvedValue(existing);
    mockUpdateWebhook.mockReset().mockResolvedValue(existing);
    mockDeleteWebhook.mockReset().mockResolvedValue(undefined);
    mockFetchDeliveries.mockReset().mockResolvedValue([]);
    mockRetryDelivery.mockReset();
  });

  it("submits the payload url and the selected events", async () => {
    renderPage();
    await waitFor(() => expect(mockFetchWebhooks).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /New webhook/i }));
    fireEvent.change(screen.getByPlaceholderText("https://example.com/webhook"), {
      target: { value: "https://hooks.example.com/apex" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "payment.processed" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // React Query forwards the variables plus its own context, so assert on the
    // first argument rather than the exact call signature.
    await waitFor(() => expect(mockCreateWebhook).toHaveBeenCalled());
    expect(mockCreateWebhook.mock.calls[0]?.[0]).toEqual({
      url: "https://hooks.example.com/apex",
      events: ["payment.processed"],
    });
  });

  it("rejects a create with no events selected", async () => {
    renderPage();
    await waitFor(() => expect(mockFetchWebhooks).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /New webhook/i }));
    fireEvent.change(screen.getByPlaceholderText("https://example.com/webhook"), {
      target: { value: "https://hooks.example.com/apex" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Select at least one event.")).toBeInTheDocument();
    expect(mockCreateWebhook).not.toHaveBeenCalled();
  });

  it("surfaces the API error message when a create fails", async () => {
    mockCreateWebhook.mockRejectedValueOnce(new Error("Endpoint already registered"));
    renderPage();
    await waitFor(() => expect(mockFetchWebhooks).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /New webhook/i }));
    fireEvent.change(screen.getByPlaceholderText("https://example.com/webhook"), {
      target: { value: "https://hooks.example.com/apex" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "outage.created" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Endpoint already registered")).toBeInTheDocument();
  });

  it("keeps deletion disabled until the confirmation phrase is typed (#599)", async () => {
    mockFetchWebhooks.mockResolvedValue([existing]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    const confirm = screen.getByRole("button", { name: "Delete webhook" });
    expect(confirm).toBeDisabled();

    // A partially typed phrase must not unlock it, and must not delete.
    fireEvent.change(screen.getByPlaceholderText("delete webhook"), {
      target: { value: "delete" },
    });
    expect(confirm).toBeDisabled();
    expect(mockDeleteWebhook).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("delete webhook"), {
      target: { value: "delete webhook" },
    });
    expect(confirm).toBeEnabled();

    fireEvent.click(confirm);

    await waitFor(() => expect(mockDeleteWebhook).toHaveBeenCalled());
    expect(mockDeleteWebhook.mock.calls[0]?.[0]).toBe("wh-1");
    expect(mockDeleteWebhook).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
