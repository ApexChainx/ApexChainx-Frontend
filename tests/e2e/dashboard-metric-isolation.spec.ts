import { expect, test, type Page, type Route } from "@playwright/test";
import { mockApi } from "./mock-api";

/**
 * Issue #607 — one bad metric used to take the whole dashboard down because the
 * only boundary was the route-level `error.tsx`. This spec serves a KPI payload
 * with `total_penalties: null`, which throws while the penalties tile formats
 * its value, and asserts:
 *
 *  - only that tile falls back,
 *  - the sibling tiles and both charts still render,
 *  - the fallback's Retry is focused (keyboard-reachable), and
 *  - retrying against a healthy endpoint restores the tile.
 */

const KPI_ENDPOINT = "**/api/v1/sla/analytics/dashboard";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
}

/** Serve a KPI payload whose penalties amount is missing. */
async function serveMalformedKpis(page: Page): Promise<void> {
  await page.route(KPI_ENDPOINT, async (route: Route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fallback();

    const origin = request.headers()["origin"] ?? "*";
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": origin },
      body: JSON.stringify({
        total_outages: 5,
        total_violations: 1,
        total_rewards: 40,
        // Malformed: the tile's formatter throws on this.
        total_penalties: null,
        net_payout: 0,
      }),
    });
  });
}

test.describe("dashboard metric isolation (#607)", () => {
  test("isolates a malformed metric to its own tile and recovers on retry", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await mockApi(page);
    await login(page);

    await serveMalformedKpis(page);
    await page.goto("/");

    // The dashboard shell survives: this heading only renders past the
    // route-level error boundary.
    await expect(page.getByRole("heading", { name: "SLA Analytics Dashboard" })).toBeVisible();

    const fallback = page.getByTestId("metric-error-boundary");
    await expect(fallback).toHaveCount(1);
    await expect(fallback).toHaveAttribute("data-metric", "Total Penalties");
    await expect(fallback).toContainText("Total Penalties unavailable");

    // The healthy tiles are all still on screen, next to the failing one.
    await expect(page.getByText("SLA Compliance")).toBeVisible();
    await expect(page.getByText("80.0%")).toBeVisible();
    await expect(page.getByText("Total Rewards")).toBeVisible();
    await expect(page.getByText("$40", { exact: true })).toBeVisible();
    await expect(page.getByText("Net Balance")).toBeVisible();

    // Charts and filters are untouched by the tile failure.
    await expect(page.getByRole("heading", { name: "SLA Compliance Trend" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Penalties vs Rewards Over Time" })).toBeVisible();
    await expect(page.getByText("Filters")).toBeVisible();

    // The boundary moves focus onto its retry control so a keyboard user can
    // recover without hunting for it.
    await expect(page.getByRole("button", { name: "Retry Total Penalties" })).toBeFocused();

    // Recovering the endpoint and retrying restores just this tile.
    await page.unroute(KPI_ENDPOINT);
    await page.getByRole("button", { name: "Retry Total Penalties" }).click();

    await expect(page.getByTestId("metric-error-boundary")).toHaveCount(0);
    await expect(page.getByText("Total Penalties")).toBeVisible();
    await expect(page.getByText("$0", { exact: true })).toBeVisible();
  });
});
