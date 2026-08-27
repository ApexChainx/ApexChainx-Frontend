import { expect, test } from "@playwright/test";
import { mockApi } from "./mock-api";

test.describe("Skip-to-content link", () => {
  test("skip link is the first tab stop and lands on main content", async ({
    page,
  }) => {
    await mockApi(page);

    // Navigate to a page with the navigation bar.
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    // The skip link should be the first focusable element.
    // Tab once: if the first tab stop is the skip link, its text should appear.
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /skip to content/i });
    await expect(skipLink).toBeFocused();

    // Activate the skip link: focus should move to the main content landmark.
    await skipLink.click();
    const main = page.locator("main#main-content");
    await expect(main).toBeFocused();
  });

  test("skip link is visually hidden until focused", async ({ page }) => {
    await mockApi(page);

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    // The skip link should exist but be hidden (sr-only pattern).
    const skipLink = page.getByRole("link", { name: /skip to content/i });
    await expect(skipLink).toBeHidden();

    // After Tab it becomes visible (focus:not-sr-only).
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeVisible();
  });
});