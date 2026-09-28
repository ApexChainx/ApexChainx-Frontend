import { expect, test, type Page } from "@playwright/test";
import { mockApi, type WebhookDeliverySeed } from "./mock-api";

/**
 * Issue #601 — webhook delivery history triage.
 *
 * A production endpoint accumulates hundreds of attempts, so the history has to
 * stay bounded and scannable. This spec seeds 24 deliveries (12 success, 8
 * failed, 4 pending — three pages at the 10-row page size) and asserts:
 *
 *  - badges render per row and are colour-coded by outcome,
 *  - paging renders a bounded slice with working Previous/Next controls,
 *  - the last-status filter narrows to a single outcome and resets to page 1,
 *  - a filter with no matches reports the empty state instead of a blank panel.
 *
 * Runs on the chromium project against the route-mocked backend in
 * `mock-api.ts`.
 */

const WEBHOOK_ID = "WEB-601";

function seedDeliveries(): WebhookDeliverySeed[] {
  const rows: WebhookDeliverySeed[] = [];
  const push = (index: number, status: WebhookDeliverySeed["status"]) => {
    rows.push({
      id: `DEL-${index}`,
      webhook_id: WEBHOOK_ID,
      event: "outage.created",
      status,
      response_code: status === "success" ? 200 : status === "failed" ? 500 : null,
      created_at: new Date(Date.UTC(2026, 7, 24, 12, 0, 0) - index * 60_000).toISOString(),
    });
  };

  // Newest first: 12 successes, then 8 failures, then 4 pending.
  for (let i = 1; i <= 12; i += 1) push(i, "success");
  for (let i = 13; i <= 20; i += 1) push(i, "failed");
  for (let i = 21; i <= 24; i += 1) push(i, "pending");
  return rows;
}

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
}

test.describe("webhook delivery history (#601)", () => {
  test("badges, filters, and pages a long delivery history", async ({ page }) => {
    await mockApi(page, {
      webhooks: [
        {
          id: WEBHOOK_ID,
          url: "https://example.com/hooks/outages",
          events: ["outage.created", "outage.resolved"],
        },
      ],
      webhookDeliveries: seedDeliveries(),
    });

    await login(page);
    await page.goto("/webhooks");

    await page.getByRole("button", { name: "Deliveries" }).click();

    const rows = page.getByTestId("delivery-row");
    await expect(rows).toHaveCount(10);
    await expect(page.getByTestId("deliveries-page")).toHaveText("Page 1 of 3");

    // Every rendered row is badged, and the badge colour tracks the outcome.
    await expect(rows.first()).toHaveAttribute("data-status", "success");
    await expect(rows.first().getByText("success")).toHaveClass(/bg-green-100/);

    // Paging forward renders the next bounded slice and enables Previous.
    const previous = page.getByRole("button", { name: "Previous" });
    const next = page.getByRole("button", { name: "Next" });
    await expect(previous).toBeDisabled();
    await next.click();
    await expect(page.getByTestId("deliveries-page")).toHaveText("Page 2 of 3");
    await expect(rows).toHaveCount(10);
    await expect(previous).toBeEnabled();

    // The first page of failures is badged red.
    await expect(rows.first()).toHaveAttribute("data-status", "failed");
    await expect(rows.first().getByText("failed")).toHaveClass(/bg-red-100/);

    // Filtering narrows to one outcome from page 1 and drops the pager when the
    // result fits on a single page.
    await page.getByLabel("Filter deliveries by last status").selectOption("pending");
    await expect(rows).toHaveCount(4);
    await expect(rows.first()).toHaveAttribute("data-status", "pending");
    await expect(page.getByTestId("deliveries-page")).toHaveCount(0);

    // The failed-triage view: only failures, each with a Retry affordance.
    await page.getByLabel("Filter deliveries by last status").selectOption("failed");
    await expect(rows).toHaveCount(8);
    await expect(rows.filter({ hasText: "failed" })).toHaveCount(8);
    await expect(rows.filter({ hasText: "success" })).toHaveCount(0);

    // Retrying a failure flips its badge to success, so it drops out of the
    // filtered view — proving the badge is driven by the delivery status
    // rather than a static fixture.
    await rows.first().getByRole("button", { name: "Retry" }).click();
    await expect(rows).toHaveCount(7);
    await expect(rows.filter({ hasText: "failed" })).toHaveCount(7);

    // Back to "All" restores paging at page 1 and reflects the retried row.
    await page.getByLabel("Filter deliveries by last status").selectOption("all");
    await expect(rows).toHaveCount(10);
    await expect(rows.filter({ hasText: "success" })).toHaveCount(10);
    await expect(page.getByTestId("deliveries-page")).toHaveText("Page 1 of 3");
  });

  test("reports an empty result set when a filter matches nothing", async ({ page }) => {
    await mockApi(page, {
      webhooks: [
        {
          id: WEBHOOK_ID,
          url: "https://example.com/hooks/outages",
          events: ["outage.created"],
        },
      ],
      webhookDeliveries: [seedDeliveries()[0]!],
    });

    await login(page);
    await page.goto("/webhooks");
    await page.getByRole("button", { name: "Deliveries" }).click();

    await expect(page.getByTestId("delivery-row")).toHaveCount(1);

    await page.getByLabel("Filter deliveries by last status").selectOption("failed");
    await expect(page.getByTestId("delivery-row")).toHaveCount(0);
    await expect(page.getByTestId("deliveries-empty")).toHaveText("No failed deliveries.");
  });
});
