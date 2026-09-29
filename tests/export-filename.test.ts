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

describe("getFilenameFromDisposition — quoted and Unicode edge cases", () => {
  it.each([
    {
      name: "quoted filename containing commas",
      header: 'attachment; filename="export,final,v2.csv"',
      expected: "export,final,v2.csv",
    },
    {
      name: "quoted filename with commas and spaces",
      header: 'attachment; filename="export, final v2.csv"',
      expected: "export, final v2.csv",
    },
    {
      name: "quoted filename containing a semicolon",
      header: 'attachment; filename="2026; q3.csv"',
      expected: "2026; q3.csv",
    },
    {
      name: "quoted filename with a backslash-escaped quote",
      header: 'attachment; filename="report\\"s.csv"',
      expected: 'report"s.csv',
    },
    {
      name: "RFC 5987 Unicode filename decodes percent-encoded UTF-8",
      header: "attachment; filename*=utf-8''r%C3%A9sum%C3%A9%20%E2%82%AC.csv",
      expected: "résumé €.csv",
    },
    {
      name: "RFC 5987 filename* with a lowercase charset",
      header: "attachment; filename*=utf-8''na%C3%AFve.json",
      expected: "naïve.json",
    },
    {
      name: "RFC 5987 filename* with an iso-8859-1 charset",
      header: "attachment; filename*=iso-8859-1''caf%23.csv",
      expected: "caf#.csv",
    },
    {
      name: "RFC 5987 filename* with a comma in the value",
      header: "attachment; filename*=utf-8''a%2Cb.csv",
      expected: "a,b.csv",
    },
    {
      name: "whitespace around the legacy parameter is tolerated",
      header: "attachment; filename =  spaced.csv  ",
      expected: "spaced.csv",
    },
  ])("$name", ({ header, expected }) => {
    expect(getFilenameFromDisposition(header)).toBe(expected);
  });

  it.each([
    {
      name: "empty quoted filename returns null",
      header: 'attachment; filename=""',
    },
    {
      name: "unterminated quoted filename returns null",
      header: 'attachment; filename="dangling.csv',
    },
    {
      name: "header without a filename parameter returns null",
      header: "attachment",
    },
  ])("$name", ({ header }) => {
    expect(getFilenameFromDisposition(header)).toBeNull();
  });
});
