import { describe, it, expect } from "vitest";
import { ENDPOINTS } from "@/lib/endpoints";

describe("Endpoints registry", () => {
  it("exports named constants correct values", () => {
    expect(ENDPOINTS.auth.login).toBe("/auth/login");
    expect(ENDPOINTS.auth.register).toBe("/auth/register");
    expect(ENDPOINTS.auth.logout).toBe("/auth/logout");
  });

  it("handles outage dynamic paths", () => {
    expect(ENDPOINTS.outages.byId("123")).toBe("/outages/123");
    expect(ENDPOINTS.outages.resolve("abc")).toBe("/outages/abc/resolve");
  });

  it("handles payment dynamic paths", () => {
    expect(ENDPOINTS.payments.byId("456")).toBe("/payments/456");
    expect(ENDPOINTS.payments.retry("456")).toBe("/payments/456/retry");
  });

  it("handles webhook dynamic paths", () => {
    expect(ENDPOINTS.webhooks.deliveries("web-1")).toBe("/webhooks/web-1/deliveries");
    expect(ENDPOINTS.webhooks.retryDelivery("web-1", "del-2")).toBe(
      "/webhooks/web-1/deliveries/del-2/retry"
    );
  });
});
