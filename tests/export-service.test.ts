/** ApexChain Network Operations Intelligence Platform */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFilenameFromDisposition } from "@/services/exportService";

describe("exportService.getFilenameFromDisposition", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-26T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses a quoted filename", () => {
    expect(getFilenameFromDisposition('attachment; filename="report.csv"', "csv")).toBe(
      "report.csv"
    );
  });

  it("parses an unquoted filename", () => {
    expect(getFilenameFromDisposition("attachment; filename=report.csv", "csv")).toBe(
      "report.csv"
    );
  });

  it("parses a filename containing spaces when quoted", () => {
    expect(
      getFilenameFromDisposition('attachment; filename="quarterly report.csv"', "csv")
    ).toBe("quarterly report.csv");
  });

  it("matches the disposition parameter case-insensitively", () => {
    expect(
      getFilenameFromDisposition('attachment; FILENAME="UPPER.CSV"', "csv")
    ).toBe("UPPER.CSV");
  });

  it("returns the date-stamped fallback when no filename is present", () => {
    expect(getFilenameFromDisposition("inline", "csv")).toBe(
      "outages_export_2026-08-26.csv"
    );
  });

  it("returns the fallback for an absent disposition header", () => {
    expect(getFilenameFromDisposition(undefined, "json")).toBe(
      "outages_export_2026-08-26.json"
    );
  });

  it("uses the fallback format extension in the generated name", () => {
    expect(getFilenameFromDisposition("inline", "json")).toBe(
      "outages_export_2026-08-26.json"
    );
  });

  // The RFC 5987 `filename*=` form is not yet parsed by the current regex; the
  // companion issue (RFC 5987 support) is what closes that gap. This documents
  // the current contract so a regression in the fallback is caught.
  it("falls back for an RFC 5987 filename* header (current contract)", () => {
    expect(
      getFilenameFromDisposition("attachment; filename*=UTF-8''reports.csv", "csv")
    ).toBe("outages_export_2026-08-26.csv");
  });

  // The current regex stops at the first quote and is greedy over non-quotes,
  // so trailing semicolon-separated parameters are folded into the filename.
  // This documents the current contract; a stricter parser is a separate change.
  it("includes trailing parameters after an unquoted filename (current contract)", () => {
    expect(
      getFilenameFromDisposition("attachment; filename=report.csv; size=123", "csv")
    ).toBe("report.csv; size=123");
  });
});