import { expect, test } from "@playwright/test";
import { mockApi } from "./mock-api";

test.describe("Full outage lifecycle journey", () => {
  test("creates, edits, resolves, records payment, lists, and deletes an outage", async ({ page }) => {
    await mockApi(page);

    // Log in
    await page.goto("/login");
    await page.getByLabel("Email").fill("ops@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/\s*$/);

    // 1. CREATE - Create a new outage
    await page.goto("/outages/new");
    await expect(page.getByRole("heading", { name: /Create Outage/i })).toBeVisible();
    await page.getByPlaceholder("e.g. Lagos Node 1").fill("Full Lifecycle Test Site");
    await page.getByPlaceholder("Describe the outage…").fill("End-to-end lifecycle test outage");
    await page.getByRole("button", { name: /Create Outage/i }).click();

    // Should redirect to detail page
    await expect(page.getByRole("heading", { level: 1, name: /^Outage /i })).toBeVisible();
    const outageId = await page.getByRole("heading", { level: 1, name: /^Outage /i }).textContent();
    expect(outageId).toMatch(/Outage OUT-\d+/);
    const createdOutageId = outageId?.replace("Outage ", "").trim() ?? "";

    // 2. EDIT - Edit the outage
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit Outage" })).toBeVisible();
    await page.getByPlaceholder("e.g. Lagos Node 1").fill("Full Lifecycle Test Site (Edited)");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Full Lifecycle Test Site (Edited)")).toBeVisible();

    // 3. RESOLVE - Resolve the outage
    await page.getByRole("button", { name: /Resolve Outage/i }).click();
    await page.getByLabel(/Mean time to resolve/i).fill("30");
    await page.getByRole("button", { name: /Confirm resolution/i }).click();
    await expect(page.getByText(/Resolution Payment/i)).toBeVisible();
    await expect(page.getByText(/USDC/i)).toBeVisible();
    await expect(page.getByText("Outage Resolved")).toBeVisible();

    // 4. VERIFY LIST INVALIDATION - Go back to list and verify the outage shows as resolved
    await page.goto("/outages");
    await expect(page.getByPlaceholder("Search outages...")).toBeVisible();
    await expect(page.getByText("Full Lifecycle Test Site (Edited)")).toBeVisible();
    await expect(page.getByText("resolved")).toBeVisible();

    // 5. DELETE - Delete the outage
    await page.getByRole("checkbox", { name: /Select Full Lifecycle Test Site.*Edited/ }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete" }).click(); // Confirm in dialog
    await expect(page.getByText("Full Lifecycle Test Site (Edited)")).not.toBeVisible();
  });
});