import { createServer, type RestHandler } from "msw/node";
import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:8000/api/v1";

const outages = [
  {
    id: "OUT-001",
    site_name: "Lagos Node 1",
    site_id: "site-001",
    severity: "high",
    status: "open",
    detected_at: "2026-07-28T08:00:00.000Z",
    description: "Primary transit link is degraded.",
    affected_services: ["DNS", "VoIP"],
    affected_subscribers: 1200,
    assigned_to: "Tolu",
    root_cause: "Fiber cut",
    resolution_notes: "",
    created_at: "2026-07-28T08:00:00.000Z",
    updated_at: "2026-07-28T08:00:00.000Z",
    resolved_at: null,
    sla_status: null,
  },
];

const payments = [
  {
    id: "PAY-001",
    outage_id: "OUT-001",
    amount: 125,
    asset_code: "USDC",
    type: "reward",
    status: "completed",
    created_at: "2026-07-28T09:00:00.000Z",
    description: "SLA reward for rapid resolution",
  },
];

const handlers: RestHandler[] = [
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string };
    if (body.email === "ops@example.com" && body.password === "password123") {
      return HttpResponse.json({
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      });
    }

    return HttpResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }),
  http.get(`${API_BASE}/auth/me`, () => HttpResponse.json({
    id: "user-1",
    email: "ops@example.com",
    role: "admin",
    full_name: "Ops User",
  })),
  http.post(`${API_BASE}/auth/logout`, () => HttpResponse.json({ message: "Logged out" })),
  http.get(`${API_BASE}/outages`, () => HttpResponse.json({ items: outages, total: outages.length })),
  http.post(`${API_BASE}/outages`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const created = {
      ...body,
      id: `OUT-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      sla_status: null,
    };
    outages.push(created as typeof outages[number]);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.get(`${API_BASE}/outages/:id`, ({ params }) => {
    const outage = outages.find((item) => item.id === params.id);
    if (!outage) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return HttpResponse.json(outage);
  }),
  http.put(`${API_BASE}/outages/:id`, async ({ params, request }) => {
    const outage = outages.find((item) => item.id === params.id);
    if (!outage) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    Object.assign(outage, body);
    return HttpResponse.json(outage);
  }),
  http.post(`${API_BASE}/outages/:id/resolve`, async ({ params, request }) => {
    const outage = outages.find((item) => item.id === params.id);
    if (!outage) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    const body = await request.json() as { mttr_minutes?: number };
    outage.status = "resolved";
    outage.resolved_at = new Date().toISOString();
    outage.resolution_notes = `Resolved in ${body.mttr_minutes ?? 30} minutes`;
    outage.sla_status = {
      status: "met",
      rating: "excellent",
      amount: 125,
    };
    return HttpResponse.json({
      outage,
      payment: {
        id: "PAY-002",
        outage_id: outage.id,
        amount: 125,
        asset_code: "USDC",
        status: "completed",
        type: "reward",
        created_at: new Date().toISOString(),
        description: "SLA reward for rapid resolution",
      },
      sla: outage.sla_status,
    });
  }),
  http.get(`${API_BASE}/payments`, () => HttpResponse.json({ items: payments, total: payments.length })),
  http.get(`${API_BASE}/payments/:id`, ({ params }) => {
    const payment = payments.find((item) => item.id === params.id);
    if (!payment) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return HttpResponse.json(payment);
  }),
  http.get(`${API_BASE}/sla/analytics/dashboard`, () => HttpResponse.json({
    total_outages: 1,
    total_violations: 0,
    total_rewards: 125,
    total_penalties: 0,
    net_payout: 125,
  })),
  http.get(`${API_BASE}/sla/analytics/trends`, () => HttpResponse.json([
    { date: "2026-07-28", total_outages: 1, violations: 0, rewards: 125, penalties: 0 },
  ])),
  http.get(`${API_BASE}/user/preferences`, () => HttpResponse.json({})),
  http.put(`${API_BASE}/user/preferences`, () => HttpResponse.json({})),
  http.get(`${API_BASE}/health`, () => HttpResponse.json({ status: "ok" })),
];

export const server = createServer(...handlers);

export function startMockServer() {
  server.listen({ onUnhandledRequest: "bypass" });
}

export function stopMockServer() {
  server.close();
}
