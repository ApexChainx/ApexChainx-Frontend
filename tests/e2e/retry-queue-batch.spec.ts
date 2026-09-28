import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mock-api";

/**
 * Issue #641 — payment retry-queue batch journey.
 *
 * The batch path is the one that can do real damage: it fans out one retry
 * per selected payment, so a regression that retries the wrong rows, retries
 * a row twice, or lets the confirm gate through on a mismatched phrase would
 * pass every other test in the suite. This spec seeds two failed payments,
 * selects both, and asserts:
 *
 *  - the typed confirm gate stays disabled until the phrase matches (and a
 *    mismatched phrase submits nothing),
 *  - both ids are retried exactly once — no duplicates — and
 *  - the queue's failed/pending summary reflects the batch.
 *
 * Runs on the chromium project against the route-mocked backend in
 * `mock-api.ts`, which splices a payment out of its queue when it is retried.
 */

const CONFIRM_PHRASE = "retry payments";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
}

test.describe("Payment retry queue batch action (#641)", () => {
  test("retries every selected id exactly once behind the typed confirm gate", async ({
    page,
  }) => {
    // Record every retry POST so duplicates are observable. The mock answers
    // a second retry for the same id with 404, but counting here catches a
    // double-submit even if the mock ever becomes idempotent.
    const retriedIds: string[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      const match = path.match(/^\/api\/v1\/payments\/([^/]+)\/retry$/);
      if (request.method() === "POST" && match) {
        retriedIds.push(match[1]!);
      }
    });

    await mockApi(page, {
      failedPayments: [
        {
          id: "PAY-BATCH-1",
          outage_id: "OUT-BATCH-1",
          amount: 120,
          asset_code: "USDC",
          type: "reward",
          created_at: "2026-08-20T09:00:00.000Z",
        },
        {
          id: "PAY-BATCH-2",
          outage_id: "OUT-BATCH-2",
          amount: 45,
          asset_code: "USDC",
          type: "penalty",
          created_at: "2026-08-21T09:00:00.000Z",
        },
      ],
    });

    await login(page);
    await page.goto("/payments/retry-queue");

    const rowOne = page.getByRole("row", { name: /OUT-BATCH-1/ });
    const rowTwo = page.getByRole("row", { name: /OUT-BATCH-2/ });
    await expect(rowOne).toBeVisible();
    await expect(rowTwo).toBeVisible();
    await expect(page.getByTestId("retry-queue-summary")).toHaveText(
      "2 failed · 0 pending",
    );

    // Select both failed payments; the batch button reflects the selection.
    await rowOne.getByRole("checkbox").check();
    await rowTwo.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Bulk Retry (2)" }).click();

    const confirm = page.getByRole("button", { name: "Confirm retry" });
    await expect(page.getByRole("heading", { name: "Retry 2 payments?" })).toBeVisible();
    await expect(confirm).toBeDisabled();

    // A mismatched phrase must not unlock the gate...
    await page.getByPlaceholder(CONFIRM_PHRASE).fill("retry");
    await expect(confirm).toBeDisabled();

    // ...and must not submit anything even if the control is clicked.
    await confirm.click({ force: true });
    expect(retriedIds).toEqual([]);

    // Passing the exact phrase unlocks confirmation.
    await page.getByPlaceholder(CONFIRM_PHRASE).fill(CONFIRM_PHRASE);
    await expect(confirm).toBeEnabled();
    await confirm.click();

    // The batch settles: the dialog closes, both rows leave the queue, and
    // the summary drops back to empty.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(rowOne).not.toBeVisible();
    await expect(rowTwo).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "No failed payments" })).toBeVisible();
    await expect(page.getByTestId("retry-queue-summary")).toHaveText(
      "0 failed · 0 pending",
    );

    // Exactly once per id, no duplicates.
    expect([...retriedIds].sort()).toEqual(["PAY-BATCH-1", "PAY-BATCH-2"]);
  });
});
