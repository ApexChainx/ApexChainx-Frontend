/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect } from "vitest";

const API_BASE = process.env.API_BASE_URL || "http://localhost:4010/api/v1";

// Contract tests exercise a live API (the Prism contract mock on :4010 or a
// real backend). Skip — rather than fail — when it isn't running, so the
// default `npm test` suite stays green without infrastructure.
const apiReachable = await fetch(`${API_BASE}/health`, {
  signal: AbortSignal.timeout(1_500),
})
  .then((response) => response.ok)
  .catch(() => false);

describe.skipIf(!apiReachable)("API Contract Tests", () => {
  it("GET /health returns 200", async () => {
    const response = await fetch(`${API_BASE}/health`);
    expect(response.status).toBe(200);
  });

  it("GET /outages returns array", async () => {
    const response = await fetch(`${API_BASE}/outages`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("POST /auth/login requires email and password", async () => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect([400, 422]).toContain(response.status);
  });
});
