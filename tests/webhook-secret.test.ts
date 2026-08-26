/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect, vi } from "vitest";
import {
  generateWebhookSecret,
  maskSecret,
  verifyWebhookSignature,
} from "@/lib/webhook-secret";

/** Compute the expected HMAC-SHA256 hex signature using the same WebCrypto primitives
 * the implementation uses, so the expectation is derived independently. */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("webhook-secret", () => {
  describe("generateWebhookSecret", () => {
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
  });

  describe("maskSecret", () => {
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

    it("returns an empty string for empty secrets", () => {
      expect(maskSecret("")).toBe("");
    });

    it("fully masks secrets at the 12-char boundary", () => {
      const secret = "abcdefghijkl";
      expect(secret).toHaveLength(12);
      const masked = maskSecret(secret);
      expect(masked).toBe("•".repeat(12));
      expect(masked).not.toContain("a");
      expect(masked).not.toContain("l");
    });

    it("keeps only first 8 and last 4 chars just above the 12-char boundary", () => {
      const secret = "abcdefghijklm"; // 13 chars
      const masked = maskSecret(secret);
      expect(masked).toHaveLength(13);
      expect(masked).toBe("abcdefgh•jklm");
    });

    it("fills the middle with bullets proportional to the trimmed count", () => {
      // 14 chars -> 8 visible + 2 middle bullets + 4 visible
      const secret = "abcdefghijklmn";
      expect(maskSecret(secret)).toBe("abcdefgh••klmn");
    });

    it("masks realistic 64-char hex secrets", () => {
      const secret = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
      expect(secret).toHaveLength(64);
      const masked = maskSecret(secret);
      expect(masked).toHaveLength(64);
      expect(masked.startsWith(secret.slice(0, 8))).toBe(true);
      expect(masked.endsWith(secret.slice(-4))).toBe(true);
      // Every middle character is a mask bullet
      expect(
        masked.slice(8, -4).split("").every((ch) => ch === "•")
      ).toBe(true);
    });
  });

  describe("verifyWebhookSignature", () => {
    it("accepts a signature computed with the same secret", async () => {
      const payload = JSON.stringify({ id: 42, status: "delivered" });
      const secret = "webhook-secret-abc";
      const signature = await signPayload(payload, secret);
      await expect(
        verifyWebhookSignature(payload, signature, secret)
      ).resolves.toBe(true);
    });

    it("rejects a signature computed with a different secret", async () => {
      const payload = '{"event":"payment.confirmed"}';
      const signature = await signPayload(payload, "correct-secret");
      await expect(
        verifyWebhookSignature(payload, signature, "wrong-secret")
      ).resolves.toBe(false);
    });

    it("rejects a signature from a tampered payload", async () => {
      const original = JSON.stringify({ amount: 100 });
      const tampered = JSON.stringify({ amount: 1000 });
      const secret = "signing-secret-42";
      const signature = await signPayload(original, secret);
      await expect(
        verifyWebhookSignature(tampered, signature, secret)
      ).resolves.toBe(false);
    });

    it("short-circuits on length mismatch (early-return branch)", async () => {
      const payload = "payload";
      const secret = "secret-key";
      const signature = await signPayload(payload, secret);
      // A signature with a different length never enters the constant-time loop
      await expect(
        verifyWebhookSignature(payload, signature.slice(1), secret)
      ).resolves.toBe(false);
      // Uppercased hex has the same length but different characters
      await expect(
        verifyWebhookSignature(payload, signature.toUpperCase(), secret)
      ).resolves.toBe(false);
    });

    it("rejects when only one character position differs", async () => {
      const payload = "callback-payload";
      const secret = "constant-time";
      const signature = await signPayload(payload, secret);
      const flipped =
        signature.slice(0, 10) +
        (signature[10] === "a" ? "b" : "a") +
        signature.slice(11);
      expect(flipped).not.toBe(signature);
      await expect(
        verifyWebhookSignature(payload, flipped, secret)
      ).resolves.toBe(false);
    });

    it("handles an empty payload consistently", async () => {
      const secret = "empty-payload-secret";
      const signature = await signPayload("", secret);
      await expect(
        verifyWebhookSignature("", signature, secret)
      ).resolves.toBe(true);
      await expect(
        verifyWebhookSignature("", signature.slice(0, 20), secret)
      ).resolves.toBe(false);
    });

    it("rejects when crypto.subtle is unavailable (non-secure context)", async () => {
      const realCrypto = globalThis.crypto;
      // Rob a stub of globalThis.crypto that lacks the subtle namespace
      vi.stubGlobal("crypto", {
        ...realCrypto,
        subtle: undefined,
      });
      await expect(
        verifyWebhookSignature("payload", "signature", "secret")
      ).rejects.toThrow();
      vi.unstubAllGlobals();
    });
  });
});