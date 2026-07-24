/** ApexChain Network Operations Intelligence Platform */
import { test, expect } from "@playwright/test";

test.describe("Visual Regression", () => {
  test("dashboard page renders correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    await expect(page).toHaveScreenshot("dashboard-page.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    
    await expect(page).toHaveScreenshot("login-page.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("outages page renders correctly", async ({ page }) => {
    await page.goto("/outages");
    await page.waitForLoadState("networkidle");
    
    await expect(page).toHaveScreenshot("outages-page.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
});
