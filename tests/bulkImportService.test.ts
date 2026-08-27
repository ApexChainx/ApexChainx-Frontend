/** ApexChain Network Operations Intelligence Platform */
import { describe, expect, it } from "vitest";

import { validateMagicBytes } from "@/services/bulkImportService";

/**
 * Build a File whose content is the given byte sequence, so we can exercise
 * magic-byte validation with precise UTF-16/UTF-32 BOMs and null bytes.
 */
function byteFile(
  name: string,
  type: string,
  bytes: number[]
): File {
  const content = new Uint8Array(bytes);
  return new File([content], name, { type });
}

const UTF8_CSV = [
  0x73, 0x65, 0x72, 0x76, 0x69, 0x63, 0x65, 0x5f, // "service_"
];
const UTF16LE_BOM = [0xff, 0xfe];
const UTF16BE_BOM = [0xfe, 0xff];
const UTF32LE_BOM = [0xff, 0xfe, 0x00, 0x00];
const UTF32BE_BOM = [0x00, 0x00, 0xfe, 0xff];

describe("validateMagicBytes", () => {
  describe("CSV (by extension and declared type)", () => {
    it("accepts a plain UTF-8 CSV", async () => {
      const file = byteFile("outages.csv", "text/csv", UTF8_CSV);
      await expect(validateMagicBytes(file)).resolves.toBeUndefined();
    });

    it("rejects a UTF-16 LE CSV", async () => {
      const file = byteFile("outages.csv", "text/csv", [
        ...UTF16LE_BOM,
        ...UTF8_CSV,
      ]);
      await expect(validateMagicBytes(file)).rejects.toThrow(/non-UTF-8/i);
    });

    it("rejects a UTF-16 BE CSV", async () => {
      const file = byteFile("outages.csv", "text/csv", [
        ...UTF16BE_BOM,
        ...UTF8_CSV,
      ]);
      await expect(validateMagicBytes(file)).rejects.toThrow(/non-UTF-8/i);
    });

    it("rejects a UTF-32 LE CSV", async () => {
      const file = byteFile("outages.csv", "text/csv", [
        ...UTF32LE_BOM,
        ...UTF8_CSV,
      ]);
      await expect(validateMagicBytes(file)).rejects.toThrow(/non-UTF-8/i);
    });

    it("rejects a UTF-32 BE CSV", async () => {
      const file = byteFile("outages.csv", "text/csv", [
        ...UTF32BE_BOM,
        ...UTF8_CSV,
      ]);
      await expect(validateMagicBytes(file)).rejects.toThrow(/non-UTF-8/i);
    });

    it("accepts a UTF-8 BOM CSV (the optional BOM is allowed)", async () => {
      const file = byteFile("outages.csv", "text/csv", [
        0xef, 0xbb, 0xbf, ...UTF8_CSV,
      ]);
      await expect(validateMagicBytes(file)).resolves.toBeUndefined();
    });

    it("rejects a CSV containing binary null bytes", async () => {
      const file = byteFile("outages.csv", "text/csv", [
        0x73, 0x00, 0x00, 0x6d, 0x65, 0x00, 0x00, 0x64, // "s\0\0m..."
      ]);
      await expect(validateMagicBytes(file)).rejects.toThrow(/binary data/i);
    });

    it("validates a mislabeled text/plain CSV by extension", async () => {
      const ok = byteFile("outages.csv", "text/plain", UTF8_CSV);
      await expect(validateMagicBytes(ok)).resolves.toBeUndefined();

      const utf16 = byteFile("outages.csv", "text/plain", [
        ...UTF16LE_BOM,
        ...UTF8_CSV,
      ]);
      await expect(validateMagicBytes(utf16)).rejects.toThrow(/non-UTF-8/i);
    });
  });

  describe("JSON (by extension and declared type)", () => {
    it("accepts a JSON object", async () => {
      const file = byteFile("outages.json", "application/json", [
        0x7b, 0x22, 0x61, 0x22, 0x3a, 0x31, 0x7d, // {"a":1}
      ]);
      await expect(validateMagicBytes(file)).resolves.toBeUndefined();
    });

    it("accepts a JSON array with leading whitespace", async () => {
      const file = byteFile("outages.json", "application/json", [
        0x20, 0x0a, 0x5b, 0x5d, // " [\n[]"
      ]);
      await expect(validateMagicBytes(file)).resolves.toBeUndefined();
    });

    it("rejects JSON that does not start with { or [", async () => {
      const file = byteFile("outages.json", "application/json", [
        0x22, 0x68, 0x69, 0x22, // "hi"
      ]);
      await expect(validateMagicBytes(file)).rejects.toThrow(/JSON format/i);
    });

    it("validates a mislabeled text/plain JSON by extension", async () => {
      const ok = byteFile("outages.json", "text/plain", [0x7b, 0x7d]); // {}
      await expect(validateMagicBytes(ok)).resolves.toBeUndefined();

      const scalar = byteFile("outages.json", "text/plain", [
        0x31, 0x32, 0x33, // 123
      ]);
      await expect(validateMagicBytes(scalar)).rejects.toThrow(/JSON format/i);
    });
  });

  describe("unknown formats", () => {
    it("allows files with no matching extension or declared type (server enforces)", async () => {
      const file = byteFile("notes.txt", "text/plain", [0x00, 0x01, 0x02]);
      await expect(validateMagicBytes(file)).resolves.toBeUndefined();
    });
  });
});