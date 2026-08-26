/** ApexChain Network Operations Intelligence Platform */
import { describe, expect, it } from "vitest";
import {
  calculateProgress,
  extractErrorMessage,
  validateMagicBytes,
} from "@/services/bulkImportService";

describe("bulkImportService.calculateProgress", () => {
  it("returns the percentage for a normal upload", () => {
    expect(calculateProgress({ loaded: 50, total: 100 } as never)).toBe(50);
    expect(calculateProgress({ loaded: 100, total: 200 } as never)).toBe(50);
  });

  it("rounds partial percentages", () => {
    expect(calculateProgress({ loaded: 1, total: 3 } as never)).toBe(33);
    expect(calculateProgress({ loaded: 2, total: 3 } as never)).toBe(67);
    expect(calculateProgress({ loaded: 33, total: 100 } as never)).toBe(33);
  });

  it("returns 0 when total is absent", () => {
    expect(calculateProgress({ loaded: 10 } as never)).toBe(0);
  });

  it("returns 0 when total is zero", () => {
    expect(calculateProgress({ loaded: 10, total: 0 } as never)).toBe(0);
  });

  it("caps progress at 100 when loaded exceeds total", () => {
    expect(calculateProgress({ loaded: 150, total: 100 } as never)).toBe(100);
  });

  it("reports 100 at completion", () => {
    expect(calculateProgress({ loaded: 100, total: 100 } as never)).toBe(100);
  });
});

describe("bulkImportService.extractErrorMessage", () => {
  const FALLBACK = "Something went wrong during bulk import.";

  it("prefers the API response message", () => {
    const error = { response: { data: { message: "Invalid row 4" } } };
    expect(extractErrorMessage(error)).toBe("Invalid row 4");
  });

  it("falls back to the error's own message", () => {
    expect(extractErrorMessage(new Error("network timeout"))).toBe("network timeout");
    expect(extractErrorMessage({ message: "plain message" })).toBe("plain message");
  });

  it("uses the generic fallback for empty errors", () => {
    expect(extractErrorMessage({})).toBe(FALLBACK);
  });

  it("uses the generic fallback for non-object errors", () => {
    expect(extractErrorMessage("boom")).toBe(FALLBACK);
    expect(extractErrorMessage(42)).toBe(FALLBACK);
  });

  // The current contract forwards null-ish inputs straight to property access,
  // which throws. Callers only ever pass real Error/AxiosError objects.
  it("throws on null-ish inputs (current contract)", () => {
    expect(() => extractErrorMessage(null)).toThrow(TypeError);
    expect(() => extractErrorMessage(undefined)).toThrow(TypeError);
  });

  it("uses the generic fallback when an API error has no message", () => {
    expect(extractErrorMessage({ response: { data: {} } })).toBe(FALLBACK);
    expect(extractErrorMessage({ response: {} })).toBe(FALLBACK);
  });
});

describe("bulkImportService.validateMagicBytes", () => {
  function fileOf(
    content: string | Uint8Array,
    name: string,
    type: string
  ): File {
    return new File([content as BlobPart], name, { type });
  }

  it("accepts valid JSON content", async () => {
    await expect(
      validateMagicBytes(fileOf('{"id":1,"status":"open"}', "data.json", "application/json"))
    ).resolves.toBeUndefined();
  });

  it("accepts JSON with leading whitespace", async () => {
    await expect(
      validateMagicBytes(fileOf("  \n\t { \"a\": 1 }", "data.json", "application/json"))
    ).resolves.toBeUndefined();
  });

  it("accepts JSON arrays", async () => {
    await expect(
      validateMagicBytes(fileOf("[1,2,3]", "data.json", "application/json"))
    ).resolves.toBeUndefined();
  });

  it("rejects JSON that does not start with an object or array", async () => {
    await expect(
      validateMagicBytes(fileOf("<html></html>", "data.json", "application/json"))
    ).rejects.toThrow("File content does not match JSON format");
  });

  it("rejects CSV containing binary null bytes", async () => {
    const binary = new Uint8Array([0x00, 0x41, 0x42, 0x43]);
    await expect(
      validateMagicBytes(fileOf(binary, "bad.csv", "text/csv"))
    ).rejects.toThrow("File appears to contain binary data");
  });

  it("accepts a text CSV without null bytes", async () => {
    await expect(
      validateMagicBytes(fileOf("id,name\n1,outage", "outages.csv", "text/csv"))
    ).resolves.toBeUndefined();
  });

  it("checks the .csv extension when the MIME type is empty", async () => {
    await expect(
      validateMagicBytes(fileOf("a,b\n1,2", "outages.csv", ""))
    ).resolves.toBeUndefined();
    await expect(
      validateMagicBytes(fileOf(new Uint8Array([0x00]), "outages.csv", ""))
    ).rejects.toThrow("File appears to contain binary data");
  });

  // Files without a JSON/CSV declared type bypass content checks entirely
  // (browser-declared-MIME bypass). Companion issue tracks tightening this.
  it("bypasses validation for other declared MIME types", async () => {
    await expect(
      validateMagicBytes(fileOf(new Uint8Array([0x00, 0x01, 0x02]), "notes.txt", "text/plain"))
    ).resolves.toBeUndefined();
  });
});