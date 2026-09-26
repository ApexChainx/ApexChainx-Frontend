import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mock-api";

/**
 * Issue #622 — window-focus refetch defaults.
 *
 * Before the app-wide QueryClient defaults, `useSlaConfig` declared no
 * staleTime and no refetchOnWindowFocus, so the query went stale instantly
 * and the react-query default (refetchOnWindowFocus: true) re-hit
 * GET /sla/config every time the operator focused the tab. These specs pin
 * the e2e contract: a focus event must not refetch the config-page query
 * unless the query opts in explicitly.
 */

const SLA_CONFIG_FIXTURE = {
  critical: { threshold_minutes: 30, penalty_per_minute: 5, reward_base: 100 },
  high: { threshold_minutes: 60, penalty_per_minute: 2, reward_base: 50 },
  medium: { threshold_minutes: 120, penalty_per_minute: 1, reward_base: 25 },
};

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

test("config page does not refetch the SLA config query on window focus", async ({
  page,
}) => {
  await mockApi(page);

  // Count every config-query fetch; the mock-api harness does not handle
  // /sla/config, so the spec provides its own fixture here.
  let slaConfigCalls = 0;
  await page.route("**/api/v1/sla/config", async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    slaConfigCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SLA_CONFIG_FIXTURE),
    });
  });

  await login(page);

  await page.goto("/config");
  await expect(
    page.getByRole("heading", { name: "SLA Configuration Management" }),
  ).toBeVisible();
  // Wait for the query to settle so the count reflects exactly one fetch.
  await expect(page.getByText("critical")).toBeVisible();
  expect(slaConfigCalls).toBe(1);

  // Prove the synthetic events below actually reach window listeners, so a
  // "no refetch" assertion cannot pass vacuously.
  await page.evaluate(() => {
    const w = window as Window & { __focusEvents?: number };
    w.__focusEvents = 0;
    window.addEventListener("focus", () => {
      w.__focusEvents = (w.__focusEvents ?? 0) + 1;
    });
  });

  // Simulate the tab regaining focus: window focus + visibility restore.
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  // Give a rogue refetch time to hit the network before asserting.
  await page.waitForTimeout(1_000);

  const focusEventsSeen = await page.evaluate(() => {
    const w = window as Window & { __focusEvents?: number };
    return w.__focusEvents ?? 0;
  });
  expect(focusEventsSeen).toBeGreaterThan(0);
  expect(slaConfigCalls).toBe(1);
});
