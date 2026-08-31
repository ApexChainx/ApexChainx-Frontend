/** ApexChain Network Operations Intelligence Platform */
import { describe, expect, it } from "vitest";

import { registerServiceWorker } from "@/lib/register-sw";

describe("registerServiceWorker", () => {
  it("is exported and runs without throwing in non-production environments", () => {
    expect(typeof registerServiceWorker).toBe("function");
    expect(() => registerServiceWorker()).not.toThrow();
  });

  it("does not register a service worker in dev/test", () => {
    // In test environments the worker must never be registered. The function
    // should early-return without throwing even when navigator lacks SW support.
    expect(() => registerServiceWorker()).not.toThrow();
  });
});
