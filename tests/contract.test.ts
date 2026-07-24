/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect } from "vitest";

describe("API Contract Tests", () => {
  const API_BASE = process.env.API_BASE_URL || "http://localhost:4010/api/v1";

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
