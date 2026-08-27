/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  retryDelivery,
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  fetchWebhookDeliveries,
} from "@/services/webhookService";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe("webhookService", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  describe("retryDelivery", () => {
    it("returns the delivery row from the retry endpoint", async () => {
      const delivery = {
        id: "delivery-1",
        webhook_id: "wh-1",
        event: "outage.created",
        status: "pending",
        response_code: null,
        created_at: "2026-08-27T00:00:00Z",
      };
      mockPost.mockResolvedValue({ data: delivery });

      const result = await retryDelivery("wh-1", "delivery-1");

      expect(mockPost).toHaveBeenCalledWith("/webhooks/wh-1/deliveries/delivery-1/retry");
      expect(result).toEqual(delivery);
    });

    it("surfaces the updated status after a successful retry", async () => {
      const updated = {
        id: "delivery-1",
        webhook_id: "wh-1",
        event: "outage.created",
        status: "success",
        response_code: 200,
        created_at: "2026-08-27T00:00:00Z",
      };
      mockPost.mockResolvedValue({ data: updated });

      const result = await retryDelivery("wh-1", "delivery-1");
      expect(result.status).toBe("success");
      expect(result.response_code).toBe(200);
    });

    it("propagates rejection when the retry endpoint errors", async () => {
      mockPost.mockRejectedValue(new Error("409 already pending"));
      await expect(retryDelivery("wh-1", "delivery-1")).rejects.toThrow(
        "409 already pending"
      );
    });
  });

  describe("other service functions", () => {
    it("fetches webhooks", async () => {
      mockGet.mockResolvedValue({ data: [{ id: "wh-1", url: "https://x", events: [], active: true, created_at: "" }] });
      const result = await fetchWebhooks();
      expect(mockGet).toHaveBeenCalledWith("/webhooks");
      expect(result).toHaveLength(1);
    });

    it("creates a webhook via POST base", async () => {
      mockPost.mockResolvedValue({ data: { id: "wh-9", url: "https://y", events: ["outage.created"], active: true, created_at: "" } });
      await createWebhook({ url: "https://y", events: ["outage.created"] });
      expect(mockPost).toHaveBeenCalledWith("/webhooks", expect.anything());
    });

    it("updates a webhook via PATCH byId", async () => {
      mockPatch.mockResolvedValue({ data: { id: "wh-1", url: "https://z", events: [], active: false, created_at: "" } });
      await updateWebhook("wh-1", { active: false });
      expect(mockPatch).toHaveBeenCalledWith("/webhooks/wh-1", expect.anything());
    });

    it("deletes a webhook via DELETE byId", async () => {
      mockDelete.mockResolvedValue({ data: null });
      await deleteWebhook("wh-1");
      expect(mockDelete).toHaveBeenCalledWith("/webhooks/wh-1");
    });

    it("fetches deliveries", async () => {
      mockGet.mockResolvedValue({ data: [{ id: "d-1", webhook_id: "wh-1", event: "x", status: "failed", response_code: 500, created_at: "" }] });
      const result = await fetchWebhookDeliveries("wh-1");
      expect(mockGet).toHaveBeenCalledWith("/webhooks/wh-1/deliveries");
      expect(result).toHaveLength(1);
    });
  });
});