/** ApexChain Frontend Test Suite */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHmac } from "node:crypto";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WebhooksPage from "@/app/webhooks/page";
import { verifyWebhookSignature } from "@/lib/webhook-secret";
import type { Webhook } from "@/types/webhook";

/**
 * Issue #603 — the signing-secret surface was dead code (`WebhookSettings` was
 * imported nowhere), so nothing exercised the path that matters most: the
 * secret an operator generates in the UI has to be the secret the
 * HMAC-SHA256 verification path accepts. These tests drive the panel through
 * the page's real rendering and then assert the generated secret round-trips
 * through `verifyWebhookSignature`.
 */

const mockFetchWebhooks = vi.fn();
const mockUpdateWebhook = vi.fn();

vi.mock("@/services/webhookService", () => ({
  fetchWebhooks: (...a: unknown[]) => mockFetchWebhooks(...a),
  updateWebhook: (...a: unknown[]) => mockUpdateWebhook(...a),
  createWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  fetchWebhookDeliveries: vi.fn().mockResolvedValue([]),
  retryDelivery: vi.fn(),
}));

const webhook: Webhook = {
  id: "WEB-1",
  url: "https://example.com/hooks/outages",
  events: ["outage.created"],
  active: true,
  created_at: "2026-01-01T09:00:00.000Z",
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <WebhooksPage />
    </QueryClientProvider>,
  );
}

/** Open the endpoint's signing-secret panel and return the revealed secret. */
function revealSecret(): string {
  const secretInput = screen.getByLabelText("Signing Secret") as HTMLInputElement;
  fireEvent.click(screen.getByRole("button", { name: "Show" }));
  return secretInput.value;
}

describe("webhook signing secret panel (#603)", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockFetchWebhooks.mockReset().mockResolvedValue([webhook]);
    mockUpdateWebhook.mockReset().mockResolvedValue(webhook);
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("generates a secret whose HMAC the verification path accepts", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Signing secret" }));
    expect(screen.getByText("Webhook Configuration")).toBeInTheDocument();

    // The panel is seeded from the endpoint being configured.
    expect(screen.getByLabelText("Webhook URL")).toHaveValue(webhook.url);

    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    const secret = revealSecret();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);

    // The contract that actually matters: whatever the UI generated must be
    // accepted by the verification path a backend/consumer would use.
    const payload = '{"event":"outage.created","id":"OUT-001"}';
    const signature = createHmac("sha256", secret).update(payload).digest("hex");
    await expect(verifyWebhookSignature(payload, signature, secret)).resolves.toBe(true);
    await expect(
      verifyWebhookSignature('{"event":"outage.created","id":"OUT-002"}', signature, secret),
    ).resolves.toBe(false);
  });

  it("registers the generated secret on the endpoint when saved", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Signing secret" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    const secret = revealSecret();
    fireEvent.click(screen.getByRole("button", { name: "Save Configuration" }));

    await waitFor(() =>
      expect(mockUpdateWebhook).toHaveBeenCalledWith("WEB-1", {
        url: webhook.url,
        events: webhook.events,
        secret,
      }),
    );
  });

  it("copies the revealed secret and confirms the clipboard write", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Signing secret" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    const secret = revealSecret();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(secret));
    expect(await screen.findByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("only reveals one endpoint's panel at a time", async () => {
    mockFetchWebhooks.mockResolvedValue([
      webhook,
      { ...webhook, id: "WEB-2", url: "https://example.com/hooks/payments" },
    ]);

    renderPage();

    const [first, second] = await screen.findAllByRole("button", { name: "Signing secret" });
    fireEvent.click(first!);
    expect(screen.getAllByText("Webhook Configuration")).toHaveLength(1);
    expect(screen.getByLabelText("Webhook URL")).toHaveValue(webhook.url);

    fireEvent.click(second!);
    expect(screen.getAllByText("Webhook Configuration")).toHaveLength(1);
    expect(screen.getByLabelText("Webhook URL")).toHaveValue(
      "https://example.com/hooks/payments",
    );
  });
});
