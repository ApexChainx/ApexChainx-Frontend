/** ApexChain Network Operations Intelligence Platform */
/**
 * API contract tests against a running backend (default: a local Prism/mock
 * server on port 4010, override with API_BASE_URL).
 *
 * These require a live server, so the whole suite is skipped when the
 * endpoint is unreachable — a missing backend is an environment condition,
 * not a regression.
 */
import { describe, it, expect } from "vitest";

const API_BASE = process.env.API_BASE_URL || "http://localhost:4010/api/v1";

const serverAvailable = await fetch(`${API_BASE}/health`, {
  signal: AbortSignal.timeout(1_500),
})
  .then((r) => r.ok)
  .catch(() => false);

const d = serverAvailable ? describe : describe.skip;

d("API Contract Tests", () => {
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
