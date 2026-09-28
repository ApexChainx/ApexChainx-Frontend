import { expect, test, type Page, type Route } from "@playwright/test";
import { mockApi } from "./mock-api";

/**
 * Issue #606 — a dashboard metrics failure used to blank the whole page with a
 * generic message. This spec forces one widget's endpoint to fail and asserts:
 *
 *  - the failure is isolated to that widget (the sibling widget still renders),
 *  - the backend correlation id is surfaced for support, and
 *  - Retry recovers just that widget without a page reload.
 */

const KPI_ENDPOINT = "**/api/v1/sla/analytics/dashboard";
const TRENDS_ENDPOINT = "**/api/v1/sla/analytics/trends";
const CORRELATION_ID = "corr-e2e-606";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
}

/** Fail one dashboard endpoint while leaving the rest of the mock intact. */
async function failEndpoint(page: Page, endpoint: string): Promise<void> {
  await page.route(endpoint, async (route: Route) => {
    const request = route.request();
    // CORS preflight is still the mock's job — only the real request fails.
    if (request.method() === "OPTIONS") return route.fallback();

    const origin = request.headers()["origin"] ?? "*";
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Expose-Headers": "x-correlation-id",
        "x-correlation-id": CORRELATION_ID,
      },
      body: JSON.stringify({
        message: "Metrics backend unavailable",
        correlationId: CORRELATION_ID,
      }),
    });
  });
}

test.describe("dashboard widget failures (#606)", () => {
  test("isolates a failing metrics widget and retries without reloading", async ({ page }) => {
    await mockApi(page);
    await login(page);

    await failEndpoint(page, KPI_ENDPOINT);
    await page.goto("/");

    // The failing widget renders its own panel with the correlation id...
    const panel = page.getByTestId("dashboard-widget-error");
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel).toHaveAttribute("data-widget", "SLA metrics");
    await expect(panel).toContainText("Metrics backend unavailable");
    await expect(panel).toContainText(CORRELATION_ID);

    // ...while the healthy widget and the page shell stay on screen.
    await expect(page.getByRole("heading", { name: "SLA Compliance Trend" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Penalties vs Rewards Over Time" })).toBeVisible();
    await expect(page.getByText("SLA Compliance")).toHaveCount(0);

    const dashboardUrl = page.url();

    // Recovering the endpoint and retrying only the failed widget restores it.
    await page.unroute(KPI_ENDPOINT);
    await page.getByRole("button", { name: "Retry SLA metrics" }).click();

    await expect(page.getByText("SLA Compliance")).toBeVisible();
    await expect(page.getByText("Total Rewards")).toBeVisible();
    await expect(panel).toHaveCount(0);

    // The sibling widget never re-mounted: the page shell was never reloaded
    // and the URL never changed.
    await expect(page.getByRole("heading", { name: "SLA Compliance Trend" })).toBeVisible();
    expect(page.url()).toBe(dashboardUrl);
  });

  test("isolates a failing trend-chart widget from the metrics tiles", async ({ page }) => {
    await mockApi(page);
    await login(page);

    await failEndpoint(page, TRENDS_ENDPOINT);
    await page.goto("/");

    const panel = page.getByTestId("dashboard-widget-error");
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel).toHaveAttribute("data-widget", "Trend charts");
    await expect(panel).toContainText(CORRELATION_ID);

    // The metrics tiles are unaffected by the chart failure.
    await expect(page.getByText("SLA Compliance")).toBeVisible();
    await expect(page.getByText("Total Penalties")).toBeVisible();
    await expect(page.getByRole("heading", { name: "SLA Compliance Trend" })).toHaveCount(0);

    await page.unroute(TRENDS_ENDPOINT);
    await page.getByRole("button", { name: "Retry Trend charts" }).click();

    await expect(page.getByRole("heading", { name: "SLA Compliance Trend" })).toBeVisible();
    await expect(panel).toHaveCount(0);
  });
});
