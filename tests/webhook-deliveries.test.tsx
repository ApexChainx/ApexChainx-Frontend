/** ApexChain Frontend Test Suite */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WebhooksPage from "@/app/webhooks/page";
import type { Webhook, WebhookDelivery } from "@/types/webhook";

/**
 * Issue #601 — the delivery history must stay scannable when an integration
 * has hundreds of attempts. These tests pin the three behaviours the issue
 * asks for: a severity-coloured status badge per row, a last-status filter for
 * failed-delivery triage, and page-size-bounded rendering with paging controls.
 */

const mockFetchWebhooks = vi.fn();
const mockFetchWebhookDeliveries = vi.fn();
const mockRetryDelivery = vi.fn();

vi.mock("@/services/webhookService", () => ({
  fetchWebhooks: (...a: unknown[]) => mockFetchWebhooks(...a),
  fetchWebhookDeliveries: (...a: unknown[]) => mockFetchWebhookDeliveries(...a),
  createWebhook: vi.fn(),
  updateWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  retryDelivery: (...a: unknown[]) => mockRetryDelivery(...a),
}));

const webhook: Webhook = {
  id: "WEB-1",
  url: "https://example.com/hook",
  events: ["outage.created"],
  active: true,
  created_at: "2026-01-01T09:00:00.000Z",
};

function delivery(index: number, status: WebhookDelivery["status"]): WebhookDelivery {
  return {
    id: `DEL-${index}`,
    webhook_id: webhook.id,
    event: "outage.created",
    status,
    response_code: status === "success" ? 200 : status === "failed" ? 500 : null,
    // Descending timestamps, so DEL-1 is the newest row.
    created_at: new Date(Date.UTC(2026, 0, 1, 12, 0, 0) - index * 60_000).toISOString(),
  };
}

/** 25 deliveries: 15 successes, 7 failures, 3 pending. */
const deliveries: WebhookDelivery[] = [
  ...Array.from({ length: 15 }, (_, i) => delivery(i + 1, "success")),
  ...Array.from({ length: 7 }, (_, i) => delivery(i + 16, "failed")),
  ...Array.from({ length: 3 }, (_, i) => delivery(i + 23, "pending")),
];

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <WebhooksPage />
    </QueryClientProvider>,
  );
}

async function openDeliveryHistory() {
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Deliveries" }));
  // The deliveries query resolves on the next tick.
  await screen.findAllByTestId("delivery-row");
}

/** Rows currently rendered in the delivery history list. */
function renderedRows(): HTMLElement[] {
  return screen.getAllByTestId("delivery-row");
}

describe("webhook delivery history (#601)", () => {
  beforeEach(() => {
    mockFetchWebhooks.mockReset().mockResolvedValue([webhook]);
    mockFetchWebhookDeliveries.mockReset().mockResolvedValue(deliveries);
    mockRetryDelivery.mockReset();
  });

  it("renders a bounded first page with a severity-coloured badge per row", async () => {
    await openDeliveryHistory();

    const rows = renderedRows();
    expect(rows).toHaveLength(10);

    // The success badge is colour-coded, so severity is readable at a glance
    // rather than only from the status word itself.
    const successRow = rows.find((row) => row.dataset.status === "success")!;
    expect(within(successRow).getByText("success").className).toContain("bg-green-100");

    // Every visible row carries a badge, so a failure stands out without
    // reading the response code or timestamp.
    for (const row of rows) {
      expect(within(row).getByText(row.dataset.status!)).toBeInTheDocument();
    }

    expect(screen.getByTestId("deliveries-page")).toHaveTextContent("Page 1 of 3");
  });

  it("pages forward and back without refetching the whole history", async () => {
    await openDeliveryHistory();

    const previous = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    expect(screen.getByTestId("deliveries-page")).toHaveTextContent("Page 2 of 3");
    expect(renderedRows()).toHaveLength(10);
    expect(previous).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("deliveries-page")).toHaveTextContent("Page 3 of 3");
    // The final page holds the remainder, not another full page.
    expect(renderedRows()).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByTestId("deliveries-page")).toHaveTextContent("Page 2 of 3");

    // A page change never re-requests the history — it is already in cache.
    expect(mockFetchWebhookDeliveries).toHaveBeenCalledTimes(1);
  });

  it("filters the history down to a single last-status and resets paging", async () => {
    await openDeliveryHistory();

    // Move off page 1 first so the filter has to reset the page.
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("deliveries-page")).toHaveTextContent("Page 2 of 3");

    fireEvent.change(screen.getByLabelText("Filter deliveries by last status"), {
      target: { value: "failed" },
    });

    // 7 failures fit on one page, and paging collapsed back to page 1.
    expect(renderedRows()).toHaveLength(7);
    expect(screen.queryByTestId("deliveries-page")).not.toBeInTheDocument();
    expect(renderedRows().every((row) => row.dataset.status === "failed")).toBe(true);

    fireEvent.change(screen.getByLabelText("Filter deliveries by last status"), {
      target: { value: "pending" },
    });
    expect(renderedRows()).toHaveLength(3);
    expect(renderedRows().every((row) => row.dataset.status === "pending")).toBe(true);

    fireEvent.change(screen.getByLabelText("Filter deliveries by last status"), {
      target: { value: "all" },
    });
    expect(renderedRows()).toHaveLength(10);
    expect(screen.getByTestId("deliveries-page")).toHaveTextContent("Page 1 of 3");
  });

  it("reports an empty result set when a filter matches nothing", async () => {
    mockFetchWebhookDeliveries.mockResolvedValue([delivery(1, "success")]);

    await openDeliveryHistory();
    expect(renderedRows()).toHaveLength(1);

    fireEvent.change(screen.getByLabelText("Filter deliveries by last status"), {
      target: { value: "failed" },
    });

    expect(screen.queryAllByTestId("delivery-row")).toHaveLength(0);
    expect(screen.getByTestId("deliveries-empty")).toHaveTextContent("No failed deliveries.");
  });
});
