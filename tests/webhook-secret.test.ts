/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect } from "vitest";
import { generateWebhookSecret, maskSecret } from "@/lib/webhook-secret";

describe("webhook-secret", () => {
  it("generates a 64-character hex secret", () => {
    const secret = generateWebhookSecret();
    expect(secret).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(secret)).toBe(true);
  });

  it("generates unique secrets", () => {
    const secret1 = generateWebhookSecret();
    const secret2 = generateWebhookSecret();
    expect(secret1).not.toBe(secret2);
  });

  it("masks long secrets correctly", () => {
    const secret = "abcdefghijklmnop";
    const masked = maskSecret(secret);
    expect(masked).toBe("abcdefgh••••mnop");
  });

  it("masks short secrets completely", () => {
    const secret = "short";
    const masked = maskSecret(secret);
    expect(masked).toBe("•••••");
  });
});
