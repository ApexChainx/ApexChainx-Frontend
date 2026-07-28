import { expect, test } from "@playwright/test";

test.describe("Core user journeys", () => {
  test("logs in, creates an outage, resolves it, and views payments", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("ops@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/\s*$/);
    await expect(page.getByRole("heading", { name: /SLA Analytics Dashboard/i })).toBeVisible();

    await page.getByRole("link", { name: /Outages/i }).click();
    await expect(page.getByRole("heading", { name: /Outages/i })).toBeVisible();

    await page.getByRole("link", { name: /Create/ }).click();
    await expect(page.getByRole("heading", { name: /Create Outage/i })).toBeVisible();

    await page.getByLabel(/Site Name/i).fill("Nairobi Edge 7");
    await page.getByLabel(/Description/i).fill("Traffic spikes caused an elevated error rate.");
    await page.getByRole("button", { name: /Create Outage/i }).click();

    await expect(page.getByRole("heading", { name: /Outage/i })).toBeVisible();
    await expect(page.getByText(/Traffic spikes caused an elevated error rate/i)).toBeVisible();

    await page.getByRole("button", { name: /Resolve Outage/i }).click();
    await page.getByLabel(/Mean time to resolve/i).fill("25");
    await page.getByRole("button", { name: /Confirm Resolve/i }).click();

    await expect(page.getByText(/Resolution Payment/i)).toBeVisible();
    await expect(page.getByText(/USDC/i)).toBeVisible();

    await page.getByRole("link", { name: /Payments/i }).click();
    await expect(page.getByRole("heading", { name: /Payments/i })).toBeVisible();
    await expect(page.getByText(/SLA reward/i)).toBeVisible();
  });
});
