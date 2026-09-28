/** ApexChain Network Operations Intelligence Platform */
import { describe, expect, it } from "vitest";

import {
  CSV_UNCLOSED_QUOTE,
  parseCSV,
  parseCSVLine,
  parseJSONRecords,
  stripBOM,
} from "@/lib/bulkImportParser";

const HEADER = "service_id,start_time,end_time";

/**
 * Issue #612: parameterized edge-case fixtures for the bulk-import parser.
 * Parsing edge cases determine whether rows silently disappear — e.g. a
 * customer note containing a comma inside a quoted field would split one
 * record into two. Each case asserts the exact row count and error markers.
 */
interface CSVParseCase {
  name: string;
  input: string;
  /** Expected column count for every parsed row (when uniform). */
  fieldCount?: number;
  expectedHeaders?: string[];
  expectedRows?: string[][];
  expectedRowCount: number;
  expectedErrorMarkers?: string[];
}

const csvCases: CSVParseCase[] = [
  {
    name: "plain LF-separated rows",
    input: `${HEADER}\ns1,2026-01-01,2026-01-02\ns2,2026-01-02,2026-01-03`,
    fieldCount: 3,
    expectedRowCount: 2,
  },
  {
    name: "BOM-prefixed file (Excel export)",
    input: `\uFEFF${HEADER}\ns1,2026-01-01,2026-01-02`,
    expectedHeaders: ["service_id", "start_time", "end_time"],
    fieldCount: 3,
    expectedRowCount: 1,
  },
  {
    name: "CRLF line endings (Windows)",
    input: `${HEADER}\r\ns1,2026-01-01,2026-01-02\r\ns2,2026-01-02,2026-01-03\r\n`,
    fieldCount: 3,
    expectedRowCount: 2,
  },
  {
    name: "quoted field containing a comma",
    input: `${HEADER},description\ns1,2026-01-01,2026-01-02,"customer note, with comma"`,
    expectedHeaders: ["service_id", "start_time", "end_time", "description"],
    fieldCount: 4,
    expectedRows: [["s1", "2026-01-01", "2026-01-02", "customer note, with comma"]],
    expectedRowCount: 1,
  },
  {
    name: "escaped double quotes inside a quoted field",
    input: `${HEADER},root_cause\ns1,2026-01-01,2026-01-02,"fiber ""cut"" on ring"`,
    expectedHeaders: ["service_id", "start_time", "end_time", "root_cause"],
    expectedRows: [["s1", "2026-01-01", "2026-01-02", 'fiber "cut" on ring']],
    expectedRowCount: 1,
  },
  {
    name: "blank and whitespace-only rows are skipped",
    input: `${HEADER}\n\ns1,2026-01-01,2026-01-02\n   \n\t\ns2,2026-01-02,2026-01-03\n`,
    fieldCount: 3,
    expectedRowCount: 2,
  },
  {
    name: "unclosed quote is reported, rows still parsed for context",
    input: `${HEADER},description\ns1,2026-01-01,2026-01-02,"oops\ns2,2026-01-02,2026-01-03,x`,
    expectedRowCount: 2,
    expectedErrorMarkers: [CSV_UNCLOSED_QUOTE],
  },
  {
    name: "BOM plus CRLF plus blank lines combined",
    input: `\uFEFF${HEADER}\r\n\r\ns1,2026-01-01,2026-01-02\r\n   \r\ns2,2026-01-02,2026-01-03\r\n`,
    fieldCount: 3,
    expectedRowCount: 2,
  },
  {
    name: "header-only file yields zero rows",
    input: HEADER,
    expectedHeaders: ["service_id", "start_time", "end_time"],
    expectedRowCount: 0,
  },
  {
    name: "empty input yields nothing",
    input: "",
    expectedHeaders: [],
    expectedRowCount: 0,
  },
  {
    name: "blank-only input yields nothing",
    input: "\n \n\t\n",
    expectedHeaders: [],
    expectedRowCount: 0,
  },
];

describe("bulkImportParser.parseCSV fixtures (#612)", () => {
  it.each(csvCases)("$name", (testCase) => {
    const result = parseCSV(testCase.input);

    expect(result.totalRows).toBe(testCase.expectedRowCount);
    expect(result.rows).toHaveLength(testCase.expectedRowCount);
    expect(result.errors).toEqual(testCase.expectedErrorMarkers ?? []);

    if (testCase.expectedHeaders) {
      expect(result.headers).toEqual(testCase.expectedHeaders);
    }
    if (testCase.fieldCount !== undefined) {
      for (const row of result.rows) {
        expect(row).toHaveLength(testCase.fieldCount);
      }
    }
    if (testCase.expectedRows) {
      expect(result.rows).toEqual(testCase.expectedRows);
    }
  });

  it("does not silently split a quoted customer note with commas (regression)", () => {
    // The motivating bug from the issue: one record with a comma inside a
    // quoted note must stay one record.
    const csv = `${HEADER},description\ns1,2026-01-01,2026-01-02,"import failed, retried twice, then ok"`;
    const result = parseCSV(csv);

    expect(result.totalRows).toBe(1);
    expect(result.rows[0]).toEqual([
      "s1",
      "2026-01-01",
      "2026-01-02",
      "import failed, retried twice, then ok",
    ]);
  });

  it("keeps a BOM from corrupting the first header name (regression)", () => {
    const result = parseCSV(`\uFEFF${HEADER}\ns1,2026-01-01,2026-01-02`);
    expect(result.headers[0]).toBe("service_id");
  });
});

describe("bulkImportParser helpers", () => {
  it.each([
    { name: "strips a leading BOM", input: "\uFEFFabc", expected: "abc" },
    { name: "leaves plain text untouched", input: "abc", expected: "abc" },
    { name: "leaves an inner BOM untouched", input: "a\uFEFFb", expected: "a\uFEFFb" },
    { name: "handles empty string", input: "", expected: "" },
  ])("$name", ({ input, expected }) => {
    expect(stripBOM(input)).toBe(expected);
  });

  it.each([
    {
      name: "splits on unquoted commas",
      line: "a,b,c",
      fields: ["a", "b", "c"],
      unclosedQuote: false,
    },
    {
      name: "keeps commas inside quotes",
      line: 'a,"b,c",d',
      fields: ["a", "b,c", "d"],
      unclosedQuote: false,
    },
    {
      name: "unescapes doubled quotes",
      line: 'a,"say ""hi""",c',
      fields: ["a", 'say "hi"', "c"],
      unclosedQuote: false,
    },
    {
      name: "flags an unclosed quote",
      line: 'a,"open',
      fields: ["a", "open"],
      unclosedQuote: true,
    },
  ])("parseCSVLine: $name", ({ line, fields, unclosedQuote }) => {
    expect(parseCSVLine(line)).toEqual({ fields, unclosedQuote });
  });
});

describe("bulkImportParser.parseJSONRecords", () => {
  it.each([
    {
      name: "parses a valid array of records",
      input: JSON.stringify([{ service_id: "s1" }, { service_id: "s2" }]),
      expectedCount: 2,
    },
    {
      name: "rejects malformed JSON with a syntax marker",
      input: "{not json",
      errorFragment: "Invalid JSON",
    },
    {
      name: "rejects a non-array payload",
      input: JSON.stringify({ service_id: "s1" }),
      errorFragment: "JSON must be",
    },
    {
      name: "rejects an empty array",
      input: "[]",
      errorFragment: "JSON array is empty",
    },
  ])("$name", ({ input, expectedCount, errorFragment }) => {
    const result = parseJSONRecords(input);

    if (expectedCount !== undefined) {
      if (!("records" in result)) throw new Error("expected records result");
      expect(result.records).toHaveLength(expectedCount);
    } else {
      if (!("error" in result)) throw new Error("expected error result");
      expect(result.error.startsWith(errorFragment!)).toBe(true);
    }
  });
});
