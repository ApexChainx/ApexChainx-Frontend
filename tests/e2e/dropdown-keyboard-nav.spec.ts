import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mock-api";

/**
 * Keyboard-only coverage for the settings language dropdown
 * (`src/components/ui/dropdown-menu.tsx`, used from
 * `src/app/setting/page.tsx`).
 *
 * The dropdown is built on `@radix-ui/react-dropdown-menu`, which already
 * implements the WAI-ARIA menu-button pattern (arrow-key / Home / End
 * navigation, roving tabindex, `aria-haspopup` / `aria-expanded`, and
 * Escape closing the menu with focus returned to the trigger). This test
 * exercises that behaviour end-to-end through the real settings page so a
 * future change to the trigger markup or menu wiring can't silently regress
 * it.
 */

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
}

test.describe("Settings language dropdown — keyboard navigation", () => {
  test("opens, navigates, commits, and closes with focus returned to the trigger", async ({
    page,
  }) => {
    await mockApi(page);
    await login(page);
    await page.goto("/setting");

    const trigger = page.getByRole("button", { name: "English" });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Open with the keyboard, not a click.
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const items = page.getByRole("menuitem");
    await expect(items).toHaveCount(3);

    // Arrow-key navigation between items.
    await page.keyboard.press("ArrowDown");
    await expect(items.nth(0)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toBeFocused();

    // End / Home jump to the last / first item.
    await page.keyboard.press("End");
    await expect(items.nth(2)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(items.nth(0)).toBeFocused();

    // Commit the second locale with Enter.
    await page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Español" })).toBeVisible();

    // Re-open and close with Escape; focus must return to the trigger.
    const updatedTrigger = page.getByRole("button", { name: "Español" });
    await updatedTrigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(updatedTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(updatedTrigger).toBeFocused();
  });
});
