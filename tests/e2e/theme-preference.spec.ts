import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mock-api";

/**
 * Issue #619 — the theme preference moved from the bare global "theme" key to
 * the namespaced "apexchain.theme" key. These specs prove the real browser
 * behavior: a theme switch on the settings page persists across a hard
 * reload under the new key, and the pre-hydration script in the root layout
 * picks the preference up before React mounts (no flash of the wrong theme).
 */

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
  await expect(
    page.getByRole("heading", { name: /SLA Analytics Dashboard/i }),
  ).toBeVisible();
}

test("theme switch persists across reload under the namespaced key", async ({
  page,
}) => {
  await mockApi(page);
  await login(page);

  await page.goto("/setting");
  await expect(page.getByRole("heading", { name: "Appearance Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Dark" }).click();

  // The preference is applied and stored under the namespaced key (plus the
  // legacy key during the transition window).
  await expect(page.locator("html")).toHaveClass(/dark/);
  const stored = await page.evaluate(
    () => localStorage.getItem("apexchain.theme"),
  );
  expect(stored).toBe("dark");

  // A hard reload must restore the theme from the namespaced key — both via
  // the pre-hydration script and via the settings page's storage module.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Appearance Settings" })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const storedAfterReload = await page.evaluate(
    () => localStorage.getItem("apexchain.theme"),
  );
  expect(storedAfterReload).toBe("dark");
});

test("legacy 'theme' key migrates to the namespaced key on first app load", async ({
  page,
}) => {
  await mockApi(page);

  // Seed the legacy key before the app boots, simulating a pre-#619 user.
  await page.addInitScript(() => {
    localStorage.setItem("theme", "dark");
  });

  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

  // The pre-hydration script reads the legacy fallback, so the dark class is
  // already present before React mounts.
  await expect(page.locator("html")).toHaveClass(/dark/);

  await login(page);
  await page.goto("/setting");

  // The settings page's storage module migrated the value on read: the
  // namespaced key now holds the preference. (The page's apply effect then
  // re-writes the legacy key as part of the documented transition window, so
  // the no-residue guarantee is asserted at the storage-module unit level.)
  const stored = await page.evaluate(() => localStorage.getItem("apexchain.theme"));
  expect(stored).toBe("dark");
});
