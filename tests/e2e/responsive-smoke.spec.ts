import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockApi } from "./mock-api";

/**
 * Responsive smoke coverage (issue #639).
 *
 * The core journeys only ran at desktop width, so nothing failed when a
 * narrow viewport started overflowing horizontally. These checks run in the
 * handset-class `mobile-chromium` project (and pin their own viewport so they
 * stay meaningful if executed elsewhere) and assert that the three surfaces
 * named in the issue — the navigation, the offline banner, and the outages
 * filtering bar — stay inside the viewport.
 *
 * The overflow assertions are intentionally strict: `scrollWidth` greater than
 * `clientWidth` means a child is wider than its container, which on a handset
 * produces a horizontally scrollable page, clipped controls, or a nav that
 * cannot be reached.
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 };

/** Sub-pixel rounding in the layout engine, not a licence to overflow. */
const OVERFLOW_TOLERANCE_PX = 1;

async function expectNoHorizontalOverflow(locator: Locator, label: string) {
  const { scrollWidth, clientWidth } = await locator.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));

  expect(
    scrollWidth,
    `${label} overflows horizontally: scrollWidth ${scrollWidth}px > clientWidth ${clientWidth}px`,
  ).toBeLessThanOrEqual(clientWidth + OVERFLOW_TOLERANCE_PX);
}

async function expectDocumentFitsViewport(page: Page) {
  const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(
    scrollWidth,
    `the document overflows the viewport: ${scrollWidth}px wide in a ${viewportWidth}px window`,
  ).toBeLessThanOrEqual(viewportWidth + OVERFLOW_TOLERANCE_PX);
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
}

test.use({ viewport: MOBILE_VIEWPORT });

test.describe("Responsive smoke — handset width", () => {
  test("the navigation fits the viewport", async ({ page }) => {
    await mockApi(page);
    await login(page);

    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    await expectNoHorizontalOverflow(nav, "the navigation");
    await expectDocumentFitsViewport(page);
  });

  test("the outages filtering bar fits the viewport", async ({ page }) => {
    await mockApi(page);
    await login(page);
    await page.goto("/outages");

    const search = page.locator('[data-tour="outages-search"]');
    await expect(search).toBeVisible({ timeout: 20_000 });

    // The filtering bar is the search field's immediate container: it groups
    // the search input with the sort/export controls.
    const filterBar = search.locator("xpath=..");

    await expectNoHorizontalOverflow(filterBar, "the outages filtering bar");
    await expectNoHorizontalOverflow(page.locator("main"), "the outages page");
    await expectDocumentFitsViewport(page);
  });

  test("the offline banner stays inside the viewport", async ({ page }) => {
    await mockApi(page);
    await login(page);

    // Drive the state directly so the assertion does not depend on the network
    // stack reporting offline: flip the connectivity flag and emit the event
    // the banner listens for.
    await page.evaluate(() => {
      Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        get: () => false,
      });
      window.dispatchEvent(new Event("offline"));
    });

    // Scope to the banner's own live region: the same message is also pushed as
    // a toast, so a bare text match would be ambiguous.
    const banner = page
      .locator('[role="status"]')
      .filter({ hasText: /You're offline\. Changes will sync/ });
    await expect(banner).toBeVisible();

    await expectNoHorizontalOverflow(banner, "the offline banner");
    await expectDocumentFitsViewport(page);

    // And it must actually sit within the horizontal bounds of the viewport.
    const box = await banner.boundingBox();
    expect(box, "the offline banner has no layout box").not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(-OVERFLOW_TOLERANCE_PX);
      expect(box.x + box.width).toBeLessThanOrEqual(
        MOBILE_VIEWPORT.width + OVERFLOW_TOLERANCE_PX,
      );
    }
  });
});
