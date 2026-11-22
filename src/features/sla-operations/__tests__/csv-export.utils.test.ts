/** ApexChain Frontend Test Suite */
/** Issue #1025 — CSV escaping, serialization options and empty datasets. */
import { describe, expect, it } from "vitest";

import {
  escapeCsvCell,
  serializeCsv,
  serializeCsvRow,
  serializeObjectsToCsv,
  type CsvColumn,
  type CsvSerializeOptions,
} from "@/features/sla-operations/utils/csv-export";

describe("escapeCsvCell (#1025)", () => {
  it("leaves plain values untouched", () => {
    expect(escapeCsvCell("Lagos Central")).toBe("Lagos Central");
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell(0)).toBe("0");
    expect(escapeCsvCell(true)).toBe("true");
    expect(escapeCsvCell(false)).toBe("false");
  });

  it("renders nullish cells as an empty string", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("quotes cells containing the delimiter, quotes, newlines or tabs", () => {
    expect(escapeCsvCell("Lagos, Node 1")).toBe('"Lagos, Node 1"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvCell("line1\r\nline2")).toBe('"line1\r\nline2"');
    expect(escapeCsvCell("tab\tseparated")).toBe('"tab\tseparated"');
  });

  it("doubles every embedded quote", () => {
    expect(escapeCsvCell('"""')).toBe('""""""""');
  });

  it("neutralises formula-like strings by default", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCsvCell("+1")).toBe("'+1");
    expect(escapeCsvCell("-SUM(A1)")).toBe("'-SUM(A1)");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvCell("\t=1")).toBe('"\'	=1"');
    expect(escapeCsvCell("\r=1")).toBe('"\'\r=1"');
  });

  it("does not touch numeric values that look like formulas", () => {
    expect(escapeCsvCell(-5)).toBe("-5");
    expect(escapeCsvCell(-5.5)).toBe("-5.5");
  });

  it("leaves formula-like strings alone when escaping is disabled", () => {
    expect(escapeCsvCell("=SUM(A1)", false)).toBe("=SUM(A1)");
    expect(escapeCsvCell("-5", false)).toBe("-5");
    expect(escapeCsvCell("a,b", false)).toBe('"a,b"');
  });

  it("quotes formula cells that also contain a delimiter", () => {
    expect(escapeCsvCell("=SUM(A1,B1)")).toBe('"\'=SUM(A1,B1)"');
  });

  it("serialises non-primitive values as JSON before escaping", () => {
    expect(escapeCsvCell({ a: 1 } as never)).toBe('"{""a"":1}"');
    expect(escapeCsvCell([1, 2] as never)).toBe('"[1,2]"');
  });
});

describe("serializeCsvRow (#1025)", () => {
  it("joins cells with the default delimiter", () => {
    expect(serializeCsvRow(["out-1", "Lagos", 12, null])).toBe("out-1,Lagos,12,");
  });

  it("supports a custom delimiter", () => {
    expect(serializeCsvRow(["out-1", "Lagos"], { delimiter: ";" })).toBe("out-1;Lagos");
    expect(serializeCsvRow(["a", "b"], { delimiter: "\t" })).toBe("a\tb");
  });

  it("quotes a cell containing a comma even when the delimiter is not a comma", () => {
    // Escaping is deliberately conservative and independent of the delimiter.
    expect(serializeCsvRow(["out-1", "Lagos, NG"], { delimiter: ";" })).toBe(
      'out-1;"Lagos, NG"',
    );
  });

  it("escapes every cell in the row", () => {
    expect(serializeCsvRow(['a "quoted" value', "with,comma", "plain"])).toBe(
      '"a ""quoted"" value","with,comma",plain',
    );
  });

  it("honours the escapeFormulas option", () => {
    expect(serializeCsvRow(["=1", "@2"], { escapeFormulas: false })).toBe("=1,@2");
    expect(serializeCsvRow(["=1", "@2"])).toBe("'=1,'@2");
  });

  it("returns an empty string for an empty row", () => {
    expect(serializeCsvRow([])).toBe("");
  });
});

describe("serializeCsv (#1025)", () => {
  it("writes a header row and data rows separated by CRLF by default", () => {
    expect(
      serializeCsv(
        [
          ["out-1", "Lagos"],
          ["out-2", "Abuja"],
        ],
        { headers: ["ID", "Site"] },
      ),
    ).toBe("ID,Site\r\nout-1,Lagos\r\nout-2,Abuja");
  });

  it("supports a custom line ending", () => {
    expect(serializeCsv([["a"], ["b"]], { eol: "\n" })).toBe("a\nb");
    expect(serializeCsv([["a"]], { eol: ";" })).toBe("a");
  });

  it("escapes header labels like any other cell", () => {
    expect(serializeCsv([], { headers: ["A,B", 'C "D"'] })).toBe('"A,B","C ""D"""');
  });

  it("writes only the header row for an empty dataset", () => {
    expect(serializeCsv([], { headers: ["ID", "Site", "Duration"] })).toBe(
      "ID,Site,Duration",
    );
  });

  it("returns an empty string for an empty dataset without headers", () => {
    expect(serializeCsv([])).toBe("");
  });

  it("keeps empty cells in the middle and at the end of a row", () => {
    expect(serializeCsv([[null, "x", undefined, ""]], { headers: ["A", "B", "C", "D"] })).toBe(
      "A,B,C,D\r\n,x,,",
    );
  });

  it("is deterministic across repeated calls", () => {
    const rows = [
      ["out-1", "Lagos, NG", 12],
      ["out-2", "Abuja", null],
    ] as const;
    const options: CsvSerializeOptions = { headers: ["ID", "Site", "Minutes"] };
    expect(serializeCsv(rows, options)).toBe(serializeCsv(rows, options));
  });
});

describe("serializeObjectsToCsv (#1025)", () => {
  const columns: CsvColumn<Record<string, unknown>>[] = [
    { key: "id", header: "ID" },
    { key: "site", header: "Site" },
  ];

  it("maps columns to headers in declaration order", () => {
    expect(
      serializeObjectsToCsv(
        [
          { id: "out-1", site: "Lagos" },
          { id: "out-2", site: "Abuja" },
        ],
        columns,
        { eol: "\n" },
      ),
    ).toBe("ID,Site\nout-1,Lagos\nout-2,Abuja");
  });

  it("uses the column format projection when provided", () => {
    const csv = serializeObjectsToCsv(
      [
        { id: "out-1", minutes: 12.345 },
        { id: "out-2", minutes: 0 },
      ],
      [
        { key: "id", header: "ID" },
        {
          key: "minutes",
          header: "Minutes",
          format: (value) =>
            typeof value === "number" ? value.toFixed(1) : "",
        },
      ],
      { eol: "\n" },
    );
    expect(csv).toBe("ID,Minutes\nout-1,12.3\nout-2,0.0");
  });

  it("renders a format projection that returns undefined as an empty cell", () => {
    const csv = serializeObjectsToCsv(
      [{ id: "out-1", site: "Lagos" }],
      [
        { key: "id", header: "ID" },
        { key: "site", header: "Site", format: () => undefined },
      ],
      { eol: "\n" },
    );
    expect(csv).toBe("ID,Site\nout-1,");
  });

  it("writes only the header row for an empty dataset", () => {
    expect(serializeObjectsToCsv([], columns, { eol: "\n" })).toBe("ID,Site");
  });

  it("renders missing properties as empty cells", () => {
    const csv = serializeObjectsToCsv([{ id: "out-1" }], columns, { eol: "\n" });
    expect(csv).toBe("ID,Site\nout-1,");
  });

  it("escapes projected and raw values", () => {
    const csv = serializeObjectsToCsv(
      [{ id: "out-1", site: 'Lagos, "Main"' }],
      columns,
      { eol: "\n" },
    );
    expect(csv).toBe('ID,Site\nout-1,"Lagos, ""Main"""');
  });

  it("passes delimiter and formula options through to cell serialization", () => {
    const csv = serializeObjectsToCsv(
      [{ id: "=out-1", site: "Lagos" }],
      columns,
      { delimiter: ";", escapeFormulas: false, eol: "\n" },
    );
    expect(csv).toBe("ID;Site\n=out-1;Lagos");
  });
});
