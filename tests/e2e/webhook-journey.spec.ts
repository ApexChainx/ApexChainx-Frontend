import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mock-api";

/**
 * Issue #598 — webhook CRUD journey.
 *
 * Covers src/app/webhooks/page.tsx end to end against the route-mocked
 * backend: an existing endpoint and its delivery history render, a new
 * webhook can be created and edited, and deletion (#599) is gated behind the
 * typed confirmation phrase. The failure path and the secret field's
 * reveal/copy contract are covered by the unit suites
 * (tests/webhook-crud.test.tsx, tests/webhook-secret-fields.test.tsx).
 */

const DELETE_PHRASE = "delete webhook";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
}

test.describe("Webhook CRUD journey (#598)", () => {
  test("renders delivery history, creates and edits an endpoint, and deletes behind the typed gate", async ({
    page,
  }) => {
    await mockApi(page, {
      webhooks: [
        {
          id: "WEB-1",
          url: "https://existing.example.com/hook",
          events: ["outage.created"],
        },
      ],
      webhookDeliveries: [
        {
          id: "DEL-1",
          webhook_id: "WEB-1",
          event: "outage.created",
          status: "failed",
          response_code: 500,
        },
      ],
    });

    await login(page);
    await page.goto("/webhooks");

    await expect(page.getByRole("heading", { name: "Webhooks" })).toBeVisible();
    await expect(page.getByText("https://existing.example.com/hook")).toBeVisible();

    // The seeded delivery renders in the endpoint's history.
    await page.getByRole("button", { name: "Deliveries" }).click();
    await expect(page.getByText("failed")).toBeVisible();
    await expect(page.getByText("HTTP 500")).toBeVisible();
    await page.getByRole("button", { name: "Hide deliveries" }).click();

    // Create.
    await page.getByRole("button", { name: "+ New webhook" }).click();
    await page
      .getByPlaceholder("https://example.com/webhook")
      .fill("https://new.example.com/hook");
    await page.getByRole("checkbox", { name: "payment.processed" }).check();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("https://new.example.com/hook")).toBeVisible();

    // Edit the first endpoint.
    await page.getByRole("button", { name: "Edit" }).first().click();
    await page
      .getByPlaceholder("https://example.com/webhook")
      .fill("https://edited.example.com/hook");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("https://edited.example.com/hook")).toBeVisible();

    // Delete (#599) — nothing fires until the exact phrase is typed.
    await page.getByRole("button", { name: "Delete" }).first().click();

    const confirm = page.getByRole("button", { name: "Delete webhook" });
    await expect(confirm).toBeDisabled();

    await page.getByPlaceholder(DELETE_PHRASE).fill("delete");
    await expect(confirm).toBeDisabled();

    await page.getByPlaceholder(DELETE_PHRASE).fill(DELETE_PHRASE);
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect(page.getByText("https://edited.example.com/hook")).not.toBeVisible();
    await expect(page.getByText("https://new.example.com/hook")).toBeVisible();
  });
});
