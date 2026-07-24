/** ApexChain Network Operations Intelligence Platform */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PREVIEW_URL || "http://localhost:3000";

test.describe("Smoke Tests", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/ApexChain/);
  });

  test("login page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await expect(page.getByRole("heading", { name: "Register" })).toBeVisible();
  });

  test("navigation links are present", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });
});
