/** ApexChain Network Operations Intelligence Platform */

/**
 * Pure parsing primitives for the bulk-import preview (issue #612).
 *
 * Extracted from the view component so the edge-case behavior — BOM
 * stripping, quoted commas, escaped quotes, CRLF line endings, blank rows —
 * can be unit-tested directly with a parameterized fixture table.
 *
 * No DOM, network, or React dependencies: string in, data out.
 */

/** Marker for structurally malformed CSV (unclosed quote). */
export const CSV_UNCLOSED_QUOTE = "CSV_UNCLOSED_QUOTE";

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
  totalRows: number;
  /** Structural error markers; empty for well-formed input. */
  errors: string[];
}

/**
 * Strip a leading UTF-8 BOM, if present. Excel and other Windows tools emit
 * `EF BB BF` before the first header cell; left in place it corrupts the
 * first column name (e.g. "\\uFEFFservice_id").
 */
export function stripBOM(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Parse a single CSV line honoring double-quoted fields: separators inside
 * quotes are literal, and `""` inside a quoted field is an escaped quote.
 */
export function parseCSVLine(line: string): { fields: string[]; unclosedQuote: boolean } {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i + 1 < line.length ? line[i + 1] : undefined;

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip the escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return { fields: result, unclosedQuote: inQuotes };
}

/**
 * Parse CSV text into headers and rows.
 *
 * - Strips a leading UTF-8 BOM.
 * - Accepts LF or CRLF line endings.
 * - Skips blank rows (including whitespace-only ones) wherever they appear.
 * - Handles quoted fields containing commas and escaped quotes.
 * - Reports an UNCLOSED_QUOTE marker instead of silently mis-splitting when
 *   a quote is left open.
 */
export function parseCSV(rawText: string): ParsedCSV {
  const text = stripBOM(rawText);
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0, errors: [] };
  }

  const errors: string[] = [];

  const parseWithErrors = (line: string): string[] => {
    const { fields, unclosedQuote } = parseCSVLine(line);
    if (unclosedQuote) {
      errors.push(CSV_UNCLOSED_QUOTE);
    }
    return fields;
  };

  const firstLine = lines[0];
  const headers = firstLine
    ? parseWithErrors(firstLine).map((h) => h.replace(/^"|"$/g, ""))
    : [];
  const rows = lines.slice(1).map(parseWithErrors);

  return {
    headers,
    rows,
    totalRows: rows.length,
    errors,
  };
}

/**
 * Parse a JSON array of records, mirroring parseCSV's return shape so the
 * preview can treat both formats uniformly.
 */
export function parseJSONRecords(
  text: string
): { records: Record<string, unknown>[]; totalRows: number } | { error: string } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return {
      error: e instanceof SyntaxError ? `Invalid JSON: ${e.message}` : "Invalid JSON: could not parse file.",
    };
  }

  if (!Array.isArray(parsed)) {
    return { error: "JSON must be an array of outage records." };
  }

  if (parsed.length === 0) {
    return { error: "JSON array is empty." };
  }

  return { records: parsed as Record<string, unknown>[], totalRows: parsed.length };
}
