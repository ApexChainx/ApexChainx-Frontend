import { expect, test } from "@playwright/test";

import { mockApi } from "./mock-api";

test.describe("Friendbot funding (issue #620)", () => {
  test("fires exactly one friendbot request after an explicit confirm", async ({ page }) => {
    await mockApi(page);

    // The settings page's Horizon health poller gates the fund button on
    // reachability — fulfil the probe so the button is enabled without
    // depending on external network access.
    await page.route("**://horizon-testnet.stellar.org/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );

    // Count friendbot hits at the network level so the "no request before
    // confirm" and "exactly one request" assertions are unconditional.
    let friendbotHits = 0;
    page.on("request", (request) => {
      if (request.url().includes("/wallets/friendbot")) friendbotHits += 1;
    });

    // Log in so the session is established before hitting /settings.
    await page.goto("/login");
    await page.getByLabel("Email").fill("ops@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/\s*$/);

    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: /settings and wallet control/i }),
    ).toBeVisible();

    // Link a testnet wallet so the fund button appears.
    await page.getByPlaceholder("User ID").fill("user-1");
    await page.getByPlaceholder("Public key").fill("GABC");
    await page.getByRole("button", { name: /link wallet/i }).click();
    await expect(page.getByText("Wallet linked successfully.")).toBeVisible();

    // Clicking fund opens the confirm dialog naming the target address —
    // no friendbot request fires until the explicit confirm.
    await page.getByRole("button", { name: /fund testnet wallet/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Stellar Friendbot for GABC/)).toBeVisible();
    expect(friendbotHits).toBe(0);

    // Perform the explicit confirm.
    await dialog.getByPlaceholder("FUND").fill("FUND");
    await dialog.getByRole("button", { name: /confirm funding/i }).click();

    // Funding succeeded and exactly one friendbot request reached the faucet.
    await expect(page.getByText("Wallet funded successfully.").first()).toBeVisible();
    expect(friendbotHits).toBe(1);

    // An over-fund attempt that is cancelled must not leak a second request.
    await page.getByRole("button", { name: /fund testnet wallet/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: /^cancel$/i }).click();
    expect(friendbotHits).toBe(1);
  });
});
