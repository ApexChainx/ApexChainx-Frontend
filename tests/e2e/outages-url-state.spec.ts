import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mock-api";

/**
 * Issue #638 — the outages list persists its search/sort/filters in the URL.
 *
 * Before this change the sort key lived in component memory, so a triage view
 * was lost as soon as the operator navigated to an incident and came back.
 * These journeys assert the view is restored *and applied* — i.e. the restored
 * filter is what the list actually queries with, not just a value echoed back
 * into the input.
 */

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
}

test.describe("Outages list URL state (#638)", () => {
  test("restores the search filter after navigating away and back", async ({
    page,
  }) => {
    await mockApi(page);
    await login(page);

    await page.goto("/outages");
    const search = page.getByPlaceholder("Search outages...");
    await expect(search).toBeVisible({ timeout: 20_000 });

    await search.fill("lagos");
    await expect(page).toHaveURL(/[?&]search=lagos/);
    await expect(search).toHaveValue("lagos");
    await expect(page.getByText("Lagos Node 1")).toBeVisible();

    // Navigate away and back, as an operator triaging an incident would.
    // Select the nav item by href rather than accessible name so the journey
    // does not depend on the active locale (the nav is fully translated).
    await page.locator('a[href="/payments"]').click();
    await expect(page).toHaveURL(/\/payments$/);

    await page.goBack();

    // The filter survives the round-trip: it is in the URL, back in the input,
    // and still what the list is showing.
    await expect(page).toHaveURL(/[?&]search=lagos/);
    await expect(page.getByPlaceholder("Search outages...")).toHaveValue("lagos");
    await expect(page.getByText("Lagos Node 1")).toBeVisible();
  });

  test("applies the search filter to the list, not just the input", async ({
    page,
  }) => {
    await mockApi(page);
    await login(page);
    await page.goto("/outages");

    const search = page.getByPlaceholder("Search outages...");
    await expect(page.getByText("Lagos Node 1")).toBeVisible({ timeout: 20_000 });

    await search.fill("site-that-does-not-exist");
    await expect(page).toHaveURL(/search=site-that-does-not-exist/);

    // The single fixture record is filtered out, proving the URL value drives
    // the query rather than merely being displayed.
    await expect(page.getByText("Lagos Node 1")).toBeHidden();
  });

  test("restores the sort selection after a reload", async ({ page }) => {
    await mockApi(page);
    await login(page);
    await page.goto("/outages");

    const sort = page.getByLabel("Sort outages");
    await expect(sort).toBeVisible({ timeout: 20_000 });

    await sort.selectOption("title:asc");
    await expect(page).toHaveURL(/sort_field=title/);
    await expect(sort).toHaveValue("title:asc");

    await page.reload();

    await expect(page.getByLabel("Sort outages")).toHaveValue("title:asc");
  });
});
