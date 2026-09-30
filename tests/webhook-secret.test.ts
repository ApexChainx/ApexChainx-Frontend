/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  generateWebhookSecret,
  verifyWebhookSignature,
  maskSecret,
} from "@/lib/webhook-secret";

/**
 * Signing contract: the signature is the lowercase-hex HMAC-SHA256 digest of
 * the raw request body, keyed by the shared secret. This mirrors exactly what
 * `verifyWebhookSignature` recomputes, so a signature produced here is the
 * canonical happy-path value.
 */
function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

const CANONICAL_PAYLOAD = '{"event":"outage.created","id":"abc123"}';

/** Flip the first character to a different (still valid) hex nibble. */
function corruptFirstNibble(signature: string): string {
  const first = signature[0] === "0" ? "1" : "0";
  return first + signature.slice(1);
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

    it.each([0, 1, 6, 11, 12])(
      "fully masks secrets of length %i (boundary)",
      (length) => {
        const secret = "a".repeat(length);
        expect(maskSecret(secret)).toBe("•".repeat(length));
      },
    );

    it("starts revealing the first 8 and last 4 characters at length 13", () => {
      // 13 is the first length where `length <= 12` no longer short-circuits.
      expect(maskSecret("abcdefghijklm")).toBe("abcdefgh•jklm");
    });
  });

  describe("verifyWebhookSignature", () => {
    const secret = generateWebhookSecret();

    it("accepts a valid HMAC-SHA256 signature", async () => {
      const signature = sign(CANONICAL_PAYLOAD, secret);
      await expect(
        verifyWebhookSignature(CANONICAL_PAYLOAD, signature, secret),
      ).resolves.toBe(true);
    });

    it("accepts the same canonical signature on every call (deterministic)", async () => {
      const signature = sign(CANONICAL_PAYLOAD, secret);
      await expect(
        verifyWebhookSignature(CANONICAL_PAYLOAD, signature, secret),
      ).resolves.toBe(true);
      await expect(
        verifyWebhookSignature(CANONICAL_PAYLOAD, signature, secret),
      ).resolves.toBe(true);
    });

    // Happy path across payload shapes the delivery pipeline can send.
    describe("accepts a correctly signed payload", () => {
      const bodies: Array<[string, string]> = [
        ["the canonical event body", CANONICAL_PAYLOAD],
        ["an empty body", ""],
        ["a body containing newlines", '{\n  "event": "outage.resolved"\n}'],
        ["a body with unicode content", '{"site":"Lagos — Node 1 🌊"}'],
        ["a long body", JSON.stringify({ items: Array.from({ length: 1_000 }, (_, i) => i) })],
      ];

      it.each(bodies)("%s", async (_name, body) => {
        const signature = sign(body, secret);
        await expect(
          verifyWebhookSignature(body, signature, secret),
        ).resolves.toBe(true);
      });
    });

    // Negative branches: every one of these must fail closed (return false),
    // never throw and never accidentally confirm a delivery.
    describe("rejects", () => {
      const canonicalSignature = sign(CANONICAL_PAYLOAD, secret);

      const negativeCases: Array<
        [string, { body: string; signature: string; key: string }]
      > = [
        [
          "a tampered body (signature no longer matches)",
          { body: CANONICAL_PAYLOAD + " ", signature: canonicalSignature, key: secret },
        ],
        [
          "a body that was truncated after signing",
          { body: CANONICAL_PAYLOAD.slice(0, -1), signature: canonicalSignature, key: secret },
        ],
        [
          "a signature minted with a different secret",
          { body: CANONICAL_PAYLOAD, signature: sign(CANONICAL_PAYLOAD, "a-different-secret"), key: secret },
        ],
        [
          "a truncated signature (short header)",
          { body: CANONICAL_PAYLOAD, signature: canonicalSignature.slice(0, 32), key: secret },
        ],
        [
          "an over-long signature (padded header)",
          { body: CANONICAL_PAYLOAD, signature: `${canonicalSignature}00`, key: secret },
        ],
        [
          "an empty signature",
          { body: CANONICAL_PAYLOAD, signature: "", key: secret },
        ],
        [
          "a whitespace-only signature",
          { body: CANONICAL_PAYLOAD, signature: " ".repeat(64), key: secret },
        ],
        [
          "a malformed (non-hex) signature of the right length",
          { body: CANONICAL_PAYLOAD, signature: "z".repeat(64), key: secret },
        ],
        [
          "a signature with the wrong character case",
          { body: CANONICAL_PAYLOAD, signature: canonicalSignature.toUpperCase(), key: secret },
        ],
        [
          "a signature differing in a single character",
          { body: CANONICAL_PAYLOAD, signature: corruptFirstNibble(canonicalSignature), key: secret },
        ],
        [
          "a valid signature for a different body",
          { body: CANONICAL_PAYLOAD, signature: sign("some-other-body", secret), key: secret },
        ],
      ];

      it.each(negativeCases)("%s", async (_name, { body, signature, key }) => {
        await expect(verifyWebhookSignature(body, signature, key)).resolves.toBe(false);
      });

      it("rejects signatures of a different length", async () => {
        await expect(
          verifyWebhookSignature(CANONICAL_PAYLOAD, "tooshort", secret),
        ).resolves.toBe(false);
      });
    });

    it("fails closed with an explicit insecure-context error when crypto.subtle is unavailable", async () => {
      const original = globalThis.crypto;

      // Simulate a non-secure context: crypto without `subtle`.
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: original
          ? { getRandomValues: original.getRandomValues.bind(original) }
          : {},
      });

      try {
        await expect(
          verifyWebhookSignature(CANONICAL_PAYLOAD, "deadbeef", secret),
        ).rejects.toThrow(/secure context/i);
      } finally {
        Object.defineProperty(globalThis, "crypto", {
          configurable: true,
          value: original,
        });
      }
    });

    it("the insecure-context failure is a plain Error, not a raw TypeError", async () => {
      const original = globalThis.crypto;
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: {},
      });

      try {
        const result = await verifyWebhookSignature(
          CANONICAL_PAYLOAD,
          "deadbeef",
          secret,
        ).then(
          () => "resolved",
          (error: unknown) => error,
        );
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).name).not.toBe("TypeError");
        expect((result as Error).message).toMatch(/crypto\.subtle/i);
      } finally {
        Object.defineProperty(globalThis, "crypto", {
          configurable: true,
          value: original,
        });
      }
    });
  });
});
