import { expect, test, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

import { verifyWebhookSignature } from "@/lib/webhook-secret";

import { mockApi } from "./mock-api";

/**
 * Issue #603 — the end-to-end webhook signing journey.
 *
 * Every other webhook test stops at the UI boundary. The riskiest contract in
 * the feature is that the secret an operator generates in the browser is the
 * same secret that HMAC-SHA256 verification accepts, over the same payload
 * bytes. This spec closes that loop:
 *
 *  1. generate and reveal the signing secret in the UI,
 *  2. register it on the endpoint (asserting what actually went over the wire),
 *  3. verify a signed payload through the real `verifyWebhookSignature` lib,
 *  4. "send" that payload at the backend, which recomputes the HMAC, and
 *  5. assert the delivery history reflects the signature result.
 *
 * It fails if the generated secret and the verification path disagree — for
 * instance if one side signed a re-serialized payload instead of the raw body.
 */

const API_BASE = "http://localhost:8000/api/v1";
const WEBHOOK_ID = "WEB-603";
const EVENT = "outage.created";
const PAYLOAD = JSON.stringify({
  event: EVENT,
  outage_id: "OUT-001",
  severity: "high",
  detected_at: "2026-08-24T12:00:00.000Z",
});

const sign = (secret: string, payload: string): string =>
  createHmac("sha256", secret).update(payload).digest("hex");

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ops@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/\s*$/);
}

/**
 * Deliver a signed payload the way a producer would: from the browser, so the
 * request flows through the mocked backend that recomputes the HMAC against
 * the secret registered on the endpoint.
 */
async function sendSignedDelivery(
  page: Page,
  payload: string,
  signature: string,
): Promise<{ signature_valid: boolean; delivery: { status: string } }> {
  return page.evaluate(
    async ({ apiBase, webhookId, event, body }) => {
      const response = await fetch(`${apiBase}/webhooks/${webhookId}/test-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`test-delivery failed: ${response.status}`);
      return response.json();
    },
    {
      apiBase: API_BASE,
      webhookId: WEBHOOK_ID,
      event: EVENT,
      body: { payload, signature, event: EVENT },
    },
  );
}

test.describe("webhook signing secret journey (#603)", () => {
  test("a secret generated in the UI verifies a signed delivery end to end", async ({ page }) => {
    await mockApi(page, {
      webhooks: [
        {
          id: WEBHOOK_ID,
          url: "https://example.com/hooks/outages",
          events: [EVENT],
        },
      ],
      webhookDeliveries: [],
    });

    await login(page);
    await page.goto("/webhooks");

    // 1. Generate and reveal the secret through the real settings panel.
    await page.getByRole("button", { name: "Signing secret" }).click();
    await expect(page.getByText("Webhook Configuration")).toBeVisible();
    await expect(page.getByLabel("Webhook URL")).toHaveValue(
      "https://example.com/hooks/outages",
    );

    await page.getByRole("button", { name: "Generate" }).click();
    await page.getByRole("button", { name: "Show" }).click();

    const secret = await page.getByLabel("Signing Secret").inputValue();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);

    // 2. Registering the secret must actually reach the endpoint.
    const patch = page.waitForRequest(
      (request) =>
        request.method() === "PATCH" && request.url().endsWith(`/webhooks/${WEBHOOK_ID}`),
    );
    await page.getByRole("button", { name: "Save Configuration" }).click();
    expect((await patch).postDataJSON()).toEqual({
      url: "https://example.com/hooks/outages",
      events: [EVENT],
      secret,
    });

    // 3. The generated secret and the verification path must agree.
    const signature = sign(secret, PAYLOAD);
    await expect(verifyWebhookSignature(PAYLOAD, signature, secret)).resolves.toBe(true);
    // A signature computed over re-serialized bytes does not verify.
    const reformatted = sign(secret, JSON.stringify(JSON.parse(PAYLOAD) as object));
    await expect(verifyWebhookSignature(PAYLOAD, reformatted, secret)).resolves.toBe(false);

    // 4. Both outcomes are sent, so the history has something to reflect.
    const accepted = await sendSignedDelivery(page, PAYLOAD, signature);
    expect(accepted.signature_valid).toBe(true);

    const rejected = await sendSignedDelivery(page, PAYLOAD, sign(secret, "{}"));
    expect(rejected.signature_valid).toBe(false);

    // 5. The delivery history reflects the signature results.
    await page.reload();
    await page.getByRole("button", { name: "Deliveries" }).click();

    const rows = page.getByTestId("delivery-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "success" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "failed" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "HTTP 401" })).toHaveCount(1);
  });

  test("rejects a delivery signed with a superseded secret", async ({ page }) => {
    const registeredSecret = "registered-secret-00000000000000000000000000000000000000";

    await mockApi(page, {
      webhooks: [
        {
          id: WEBHOOK_ID,
          url: "https://example.com/hooks/outages",
          events: [EVENT],
          secret: registeredSecret,
        },
      ],
      webhookDeliveries: [],
    });

    await login(page);
    await page.goto("/webhooks");

    // An operator rotating the secret in the UI must not break the old key
    // silently: a delivery signed with the previous secret is rejected.
    await page.getByRole("button", { name: "Signing secret" }).click();
    await page.getByRole("button", { name: "Generate" }).click();
    await page.getByRole("button", { name: "Show" }).click();

    const rotated = await page.getByLabel("Signing Secret").inputValue();
    expect(rotated).not.toBe(registeredSecret);

    const stale = sign(registeredSecret, PAYLOAD);
    await expect(verifyWebhookSignature(PAYLOAD, stale, rotated)).resolves.toBe(false);

    const result = await sendSignedDelivery(page, PAYLOAD, stale);
    expect(result.signature_valid).toBe(false);
    expect(result.delivery.status).toBe("failed");

    await page.getByRole("button", { name: "Save Configuration" }).click();
    await page.reload();
    await page.getByRole("button", { name: "Deliveries" }).click();
    await expect(page.getByTestId("delivery-row").filter({ hasText: "failed" })).toHaveCount(1);
  });
});
