/** ApexChain Frontend Test Suite */
/** Issue #921 — CSV cell escaping and deterministic serialization. */
import { describe, expect, it } from "vitest";

import {
  escapeCsvCell,
  serializeCsv,
  serializeCsvRow,
  serializeObjectsToCsv,
} from "@/features/sla-operations/utils/csv-export";

describe("CSV export utilities (#921)", () => {
  it("escapes delimiters, quotes and newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralises formula-like string cells but leaves numbers alone", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCsvCell("-5")).toBe("'-5");
    expect(escapeCsvCell(-5)).toBe("-5");
  });

  it("handles nullish and primitive cells", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
    expect(escapeCsvCell(true)).toBe("true");
    expect(escapeCsvCell(42)).toBe("42");
  });

  it("serializes rows with optional headers and custom line endings", () => {
    expect(serializeCsvRow([1, "a,b", null])).toBe('1,"a,b",');
    expect(serializeCsv([[1, 2]], { headers: ["A", "B"], eol: "\n" })).toBe(
      "A,B\n1,2",
    );
  });

  it("serializes objects via an explicit column mapping", () => {
    const csv = serializeObjectsToCsv(
      [
        { id: "out-1", site: "Lagos, Node 1" },
        { id: "out-2", site: "Abuja" },
      ],
      [
        { key: "id", header: "ID" },
        { key: "site", header: "Site" },
      ],
      { eol: "\n" },
    );
    expect(csv).toBe('ID,Site\nout-1,"Lagos, Node 1"\nout-2,Abuja');
  });
});
