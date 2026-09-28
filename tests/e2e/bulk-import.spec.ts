import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mock-api";

/**
 * Bulk import: upload -> result -> history journey.
 *
 * Uses in-memory CSV fixtures (no filesystem fixture files) and the
 * route-based backend mock in `mock-api.ts`, which keeps its bulk-import
 * history in a module-scoped array. Each test uses a unique, timestamped
 * filename so assertions can target "this test's record" via its filename
 * rather than assuming the history list is empty, since the mock's history
 * state is not reset between tests in the same worker.
 *
 * Issue #613 extends the happy path with the failure paths operators actually
 * hit: an oversized-file rejection (client-side size guard), a partially
 * failed import (mixed valid/invalid rows -> per-row error chips + a
 * partial-failure summary banner), a full failure (every row rejected), and
 * a mid-upload cancellation (the mock aborts the request -> the UI must not
 * report success). The mock selects the outcome from the fixture filename
 * ("partial" / "fullfail" / "invalid"); the default is a clean import.
 */

const VALID_HEADERS = "service_id,start_time,end_time";

function validCsv(): string {
  return [VALID_HEADERS, "s1,2026-01-01T00:00:00Z,2026-01-02T00:00:00Z"].join("\n");
}

// Passes the client-side required-column/required-field checks (so the
// Upload button is enabled), but encodes a business-rule violation
// (start_time after end_time) that only the mocked "backend" rejects —
// exercising the server-validation-errors path rather than the client's
// blocking-error path.
function invalidCsv(): string {
  return [VALID_HEADERS, "s1,2026-01-02T00:00:00Z,2026-01-01T00:00:00Z"].join("\n");
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
}

test.describe("Bulk import journey", () => {
  // Issue #609: a larger fixture must be page-able in the preview before
  // submission, with the row-count readout tracking the visible window.
  test("pages through a large preview before submission", async ({ page }) => {
    await mockApi(page);
    await login(page);

    await page.goto("/bulk-import");
    await expect(page.getByRole("heading", { name: "Bulk Outage Import" })).toBeVisible();

    const lines = [VALID_HEADERS];
    for (let i = 1; i <= 30; i++) {
      lines.push(`s${i},2026-01-01T00:00:00Z,2026-01-02T00:00:00Z`);
    }

    await page.getByLabel("Choose file").setInputFiles({
      name: `large-preview-${Date.now()}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(lines.join("\n")),
    });

    // Row-count readout reflects the full file, only the first page renders.
    await expect(page.getByText("30 rows")).toBeVisible();
    await expect(page.getByText("s1")).toBeVisible();
    await expect(page.getByText("s11")).toBeHidden();

    // Previous/next paging works...
    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.getByText("s11")).toBeVisible();
    await expect(page.getByText("s1")).toBeHidden();

    // ...and the upload itself still succeeds from a later page.
    await page.getByRole("button", { name: /upload file/i }).click();
    await expect(page.getByText("Import Summary")).toBeVisible();
  });

  // Issue #611: history renders a summary strip and per-run failure badges,
  // and pagination keeps the DOM bounded for long histories.
  test("history shows a summary strip, failure badges, and bounded pagination", async ({ page }) => {
    await mockApi(page);
    await login(page);

    // Seed 12 runs by importing one file per run so the history spans two
    // pages at 10 records per page.
    await page.goto("/bulk-import");
    const seed = Date.now();
    const filenames = Array.from({ length: 12 }, (_, i) => `history-run-${i + 1}-${seed}.csv`);
    for (const filename of filenames) {
      await page.getByLabel("Choose file").setInputFiles({
        name: filename,
        mimeType: "text/csv",
        buffer: Buffer.from(validCsv()),
      });
      await expect(page.getByText("Import Summary")).toBeVisible();
      await page.getByRole("button", { name: /upload another file/i }).click();
    }

    await page.getByRole("link", { name: /view history/i }).click();
    await expect(page.getByRole("heading", { name: "Import History" })).toBeVisible();

    // Summary strip renders with a success-rate percentage.
    const summary = page.getByTestId("history-summary");
    await expect(summary).toBeVisible();
    await expect(summary).toContainText(/\d+%/);

    // Visible runs carry a failure-rate badge; page 1 shows 10 of the 12.
    await expect(page.getByText(/0% failures/i).first()).toBeVisible();
    expect(await page.getByText(/% failures/i).count()).toBeLessThanOrEqual(10);

    // Pagination keeps the DOM bounded and slides to page 2.
    await expect(page.getByRole("navigation", { name: /history pagination/i })).toBeVisible();
    expect(await page.getByRole("button", { name: /^Page \d+$/ }).count()).toBeLessThanOrEqual(5);
    await expect(page.getByText(filenames[11]!, { exact: true })).toBeVisible(); // newest first
    await expect(page.getByText(filenames[2]!, { exact: true })).toBeVisible(); // 10th record
    await expect(page.getByText(filenames[1]!, { exact: true })).toBeHidden();

    await page.getByRole("button", { name: /next/i }).click();
    await expect(page.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(filenames[1]!, { exact: true })).toBeVisible();
  });

  test("uploads a valid CSV, shows the result, and lists it in history", async ({ page }) => {
    await mockApi(page);
    await login(page);

    const filename = `valid-import-${Date.now()}.csv`;

    await page.goto("/bulk-import");
    await expect(page.getByRole("heading", { name: "Bulk Outage Import" })).toBeVisible();

    await page.getByLabel("Choose file").setInputFiles({
      name: filename,
      mimeType: "text/csv",
      buffer: Buffer.from(validCsv()),
    });

    // File accepted and previewed before upload.
    await expect(page.getByText(filename)).toBeVisible();

    const uploadButton = page.getByRole("button", { name: /upload file/i });
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();

    // Result view renders a success summary.
    await expect(page.getByText("Import Summary")).toBeVisible();
    await expect(page.getByText("Imported")).toBeVisible();

    // History shows the new record.
    await page.getByRole("link", { name: /view history/i }).click();
    await expect(page.getByRole("heading", { name: "Import History" })).toBeVisible();
    await expect(page.getByText(filename)).toBeVisible();
    await expect(page.getByText(/2 imported/i)).toBeVisible();
  });

  test("uploads a CSV the backend rejects and shows the per-row error, then lists it in history", async ({
    page,
  }) => {
    await mockApi(page);
    await login(page);

    const filename = `invalid-import-${Date.now()}.csv`;

    await page.goto("/bulk-import");

    await page.getByLabel("Choose file").setInputFiles({
      name: filename,
      mimeType: "text/csv",
      buffer: Buffer.from(invalidCsv()),
    });

    await expect(page.getByText(filename)).toBeVisible();

    // The row is well-formed (all required columns present and non-empty),
    // so client-side validation passes and the upload proceeds — the
    // rejection comes back from the (mocked) server.
    const uploadButton = page.getByRole("button", { name: /upload file/i });
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();

    await expect(page.getByText("Import Summary")).toBeVisible();
    await expect(page.getByText(/1 validation error/i)).toBeVisible();
    await expect(page.getByText(/start_time must be before end_time/i)).toBeVisible();

    // Error report download affordance renders for the failed rows.
    await expect(page.getByRole("button", { name: /download report/i })).toBeVisible();

    // History reflects the error count for this import.
    await page.getByRole("link", { name: /view history/i }).click();
    await expect(page.getByText(filename)).toBeVisible();
    await expect(page.getByText(/1 errors/i)).toBeVisible();
  });

  test("rejects an oversized file before upload and surfaces the size error", async ({ page }) => {
    // Guard: if the view ever accepts an oversized file and submits it, this
    // records the leaked request so the test fails loudly.
    const bulkRequests: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/v1/outages/bulk")) {
        bulkRequests.push(request.url());
      }
    });

    await mockApi(page);
    await login(page);

    await page.goto("/bulk-import");
    await expect(page.getByRole("heading", { name: "Bulk Outage Import" })).toBeVisible();

    // 11MB — over the 10MB client-side limit.
    await page.getByLabel("Choose file").setInputFiles({
      name: "oversized-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.alloc(11 * 1024 * 1024),
    });

    // The size rejection surfaces as an error banner...
    await expect(page.getByText("File too large. Maximum size: 10MB")).toBeVisible();

    // ...the file is not staged for upload...
    const uploadButton = page.getByRole("button", { name: /upload file/i });
    await expect(uploadButton).toBeDisabled();
    await expect(page.getByText("oversized-import.csv")).toHaveCount(0);

    // ...and no import request reaches the (mocked) backend.
    expect(bulkRequests).toHaveLength(0);
  });

  test("shows per-row error chips and a partial-failure summary for a mixed valid/invalid import", async ({
    page,
  }) => {
    await mockApi(page);
    await login(page);

    // 4 data rows; file-rows 2 and 4 violate start_time < end_time (a
    // business rule only the backend checks). The mock keys off the "partial"
    // filename and reports exactly those two rows as failed.
    const csv = [
      VALID_HEADERS,
      "s1,2026-01-03T00:00:00Z,2026-01-02T00:00:00Z", // row 2: start after end
      "s2,2026-01-01T00:00:00Z,2026-01-02T00:00:00Z", // row 3: valid
      "s3,2026-01-06T00:00:00Z,2026-01-05T00:00:00Z", // row 4: start after end
      "s4,2026-01-04T00:00:00Z,2026-01-05T00:00:00Z", // row 5: valid
    ].join("\n");

    const filename = `partial-import-${Date.now()}.csv`;

    await page.goto("/bulk-import");
    await page.getByLabel("Choose file").setInputFiles({
      name: filename,
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });

    const uploadButton = page.getByRole("button", { name: /upload file/i });
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();

    const resultCard = page.locator("div.rounded-xl", { hasText: "Import Summary" });
    await expect(resultCard.getByText("Import Summary")).toBeVisible();

    // Exact per-row counts: 2 imported, 0 skipped, 2 errors.
    const counts = resultCard.locator("p.text-2xl");
    await expect(counts).toHaveCount(3);
    await expect(counts.nth(0)).toHaveText("2"); // imported
    await expect(counts.nth(1)).toHaveText("0"); // skipped
    await expect(counts.nth(2)).toHaveText("2"); // errors

    // Partial-failure summary banner distinguishes this from a full failure.
    await expect(resultCard.getByText("2 of 4 rows failed")).toBeVisible();

    // Inline error chips render for exactly the failed rows (2 and 4).
    const chips = resultCard.locator("li");
    await expect(chips).toHaveCount(2);
    await expect(chips.filter({ hasText: "Row 2:" })).toHaveCount(1);
    await expect(chips.filter({ hasText: "Row 4:" })).toHaveCount(1);
    await expect(chips.filter({ hasText: "start_time must be before end_time." })).toHaveCount(2);

    // History reflects the counts for this record.
    await page.getByRole("link", { name: /view history/i }).click();
    await expect(page.getByRole("heading", { name: "Import History" })).toBeVisible();
    const recordCard = page.locator("div.rounded-xl", { hasText: filename });
    await expect(recordCard).toBeVisible();
    await expect(recordCard.getByText(/2 imported/i)).toBeVisible();
    await expect(recordCard.getByText(/2 errors/i)).toBeVisible();
  });

  test("distinguishes a full failure (every row failed) from a partial failure", async ({ page }) => {
    await mockApi(page);
    await login(page);

    // 2 data rows, both invalid. The mock keys off the "fullfail" filename and
    // rejects every row.
    const csv = [
      VALID_HEADERS,
      "s1,2026-01-02T00:00:00Z,2026-01-01T00:00:00Z", // row 2: invalid
      "s2,2026-01-03T00:00:00Z,2026-01-02T00:00:00Z", // row 3: invalid
    ].join("\n");

    const filename = `fullfail-import-${Date.now()}.csv`;

    await page.goto("/bulk-import");
    await page.getByLabel("Choose file").setInputFiles({
      name: filename,
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });

    const uploadButton = page.getByRole("button", { name: /upload file/i });
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();

    const resultCard = page.locator("div.rounded-xl", { hasText: "Import Summary" });
    await expect(resultCard.getByText("Import Summary")).toBeVisible();

    // Exact per-row counts: 0 imported, 0 skipped, 2 errors.
    const counts = resultCard.locator("p.text-2xl");
    await expect(counts).toHaveCount(3);
    await expect(counts.nth(0)).toHaveText("0"); // imported
    await expect(counts.nth(1)).toHaveText("0"); // skipped
    await expect(counts.nth(2)).toHaveText("2"); // errors

    // Full-failure summary banner (distinct from the partial "X of Y" wording).
    await expect(resultCard.getByText("All 2 rows failed")).toBeVisible();

    // Chips for both failed rows.
    const chips = resultCard.locator("li");
    await expect(chips).toHaveCount(2);
    await expect(chips.filter({ hasText: "Row 2:" })).toHaveCount(1);
    await expect(chips.filter({ hasText: "Row 3:" })).toHaveCount(1);

    // History reflects the counts for this record.
    await page.getByRole("link", { name: /view history/i }).click();
    await expect(page.getByRole("heading", { name: "Import History" })).toBeVisible();
    const recordCard = page.locator("div.rounded-xl", { hasText: filename });
    await expect(recordCard).toBeVisible();
    await expect(recordCard.getByText(/0 imported/i)).toBeVisible();
    await expect(recordCard.getByText(/2 errors/i)).toBeVisible();
  });

  test("does not report success when the upload is aborted mid-flight", async ({ page }) => {
    await mockApi(page);

    // The mock aborts the bulk-upload request (registered after mockApi so it
    // takes precedence for this endpoint only), simulating a cancelled/failed
    // upload.
    await page.route("**/api/v1/outages/bulk", (route) => route.abort("internetdisconnected"));

    await login(page);

    await page.goto("/bulk-import");
    await page.getByLabel("Choose file").setInputFiles({
      name: `cancelled-import-${Date.now()}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(validCsv()),
    });

    const uploadButton = page.getByRole("button", { name: /upload file/i });
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();

    // The aborted upload surfaces as a non-success (error/cancelled) state...
    await expect(page.getByRole("alert")).toBeVisible();
    // ...and must never be reported as a successful import.
    await expect(page.getByText("Import Summary")).toHaveCount(0);
  });
});
