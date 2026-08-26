import { describe, expect, it } from "vitest";

import { sanitizeCsvCell } from "@/services/bulkImportService";

describe("sanitizeCsvCell", () => {
  it("prefixes a leading single quote to cells starting with =", () => {
    expect(sanitizeCsvCell('=HYPERLINK("http://evil","click")')).toBe(
      "'=HYPERLINK(\"http://evil\",\"click\")"
    );
  });

  it("prefixes a leading single quote to cells starting with +", () => {
    expect(sanitizeCsvCell("+1+1")).toBe("'+1+1");
  });

  it("prefixes a leading single quote to cells starting with -", () => {
    expect(sanitizeCsvCell("-1+1+cmd|' /C calc'!A0")).toBe(
      "'-1+1+cmd|' /C calc'!A0"
    );
  });

  it("prefixes a leading single quote to cells starting with @", () => {
    expect(sanitizeCsvCell("@SUM(1,1)")).toBe("'@SUM(1,1)");
  });

  it("prefixes a leading single quote to cells starting with a tab", () => {
    expect(sanitizeCsvCell("\t=cmd|'/C calc'!A0")).toBe("'\t=cmd|'/C calc'!A0");
  });

  it("prefixes a leading single quote to cells starting with a carriage return", () => {
    expect(sanitizeCsvCell("\r=cmd|'/C calc'!A0")).toBe("'\r=cmd|'/C calc'!A0");
  });

  it("leaves normal text cells unchanged", () => {
    expect(sanitizeCsvCell("Row 5 failed to import")).toBe(
      "Row 5 failed to import"
    );
  });

  it("leaves cells containing dangerous characters mid-string unchanged", () => {
    expect(sanitizeCsvCell("value = not a formula")).toBe(
      "value = not a formula"
    );
  });

  it("leaves empty cells unchanged", () => {
    expect(sanitizeCsvCell("")).toBe("");
  });

  it("leaves a leading whitespace-space cell unchanged (space is not dangerous)", () => {
    expect(sanitizeCsvCell(" normal")).toBe(" normal");
  });
});
