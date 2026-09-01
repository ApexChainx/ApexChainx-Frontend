/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect } from "vitest";
import { getFilenameFromDisposition } from "@/services/exportService";

describe("getFilenameFromDisposition", () => {
  it("returns null when the header is absent", () => {
    expect(getFilenameFromDisposition(undefined)).toBeNull();
    expect(getFilenameFromDisposition("")).toBeNull();
  });

  it("parses a legacy quoted filename=", () => {
    expect(
      getFilenameFromDisposition('attachment; filename="report.csv"'),
    ).toBe("report.csv");
  });

  it("parses an unquoted legacy filename=", () => {
    expect(
      getFilenameFromDisposition("attachment; filename=report.csv"),
    ).toBe("report.csv");
  });

  it("parses an RFC 5987 filename* percent-decoded value", () => {
    expect(
      getFilenameFromDisposition(
        "attachment; filename*=UTF-8''outages_%E2%80%94_2026.csv",
      ),
    ).toBe("outages_—_2026.csv");
  });

  it("parses an RFC 5987 filename* ASCII value", () => {
    expect(
      getFilenameFromDisposition("attachment; filename*=outages_2026.csv"),
    ).toBe("outages_2026.csv");
  });

  it("prefers filename*= over legacy filename=", () => {
    expect(
      getFilenameFromDisposition(
        "attachment; filename=fallback.csv; filename*=UTF-8''outages_%E2%80%94.csv",
      ),
    ).toBe("outages_—.csv");
  });

  it("survives a malformed percent-encoding by returning the raw value", () => {
    expect(
      getFilenameFromDisposition("attachment; filename*=UTF-8''outages_%ZZ.csv"),
    ).toBe("outages_%ZZ.csv");
  });
});
