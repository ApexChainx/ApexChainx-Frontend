/** ApexChain Network Operations Intelligence Platform */
/**
 * CSV serialization utilities (Issue #921).
 *
 * Workspace-local helpers for turning tabular operations data into CSV text.
 * Pure and dependency free; the caller decides where the resulting string is
 * written. Cells containing delimiters, quotes or newlines are quoted, and
 * string cells that could be interpreted as spreadsheet formulas are neutralised.
 */

/** Primitive value accepted as a CSV cell. */
export type CsvCell = string | number | boolean | null | undefined;

/** Options controlling CSV serialization. */
export interface CsvSerializeOptions {
  /** Header labels written as the first row. */
  headers?: readonly string[] | undefined;
  /** Field delimiter. Defaults to ",". */
  delimiter?: string | undefined;
  /** Row separator. Defaults to "\\r\\n". */
  eol?: string | undefined;
  /** Neutralise formula-like string cells. Defaults to true. */
  escapeFormulas?: boolean | undefined;
}

/** A column definition for object-based serialization. */
export interface CsvColumn<T> {
  key: keyof T;
  header: string;
  /** Optional projection from the raw value to a CSV cell. */
  format?: (value: T[keyof T]) => CsvCell | undefined;
}

const DEFAULT_DELIMITER = ",";
const DEFAULT_EOL = "\r\n";

/** Coerce an arbitrary value into a primitive CSV cell. */
function toCsvCell(value: unknown): CsvCell {
  if (value === null || value === undefined) {
    return null;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return JSON.stringify(value);
}

/** Escape and quote a single CSV cell. */
export function escapeCsvCell(value: CsvCell, escapeFormulas = true): string {
  const raw = toCsvCell(value);
  let text = raw === null ? "" : String(raw);

  if (escapeFormulas && typeof raw === "string" && /^[=+\-@\t\r]/.test(raw)) {
    text = `'${text}`;
  }

  if (/[",\r\n\t]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Serialize one row of cells. */
export function serializeCsvRow(
  cells: readonly CsvCell[],
  options: CsvSerializeOptions = {},
): string {
  const delimiter = options.delimiter ?? DEFAULT_DELIMITER;
  const escapeFormulas = options.escapeFormulas ?? true;
  return cells
    .map((cell) => escapeCsvCell(cell, escapeFormulas))
    .join(delimiter);
}

/** Serialize a table of rows, optionally prefixed with a header row. */
export function serializeCsv(
  rows: readonly (readonly CsvCell[])[],
  options: CsvSerializeOptions = {},
): string {
  const eol = options.eol ?? DEFAULT_EOL;
  const lines: string[] = [];
  if (options.headers) {
    lines.push(serializeCsvRow(options.headers, options));
  }
  for (const row of rows) {
    lines.push(serializeCsvRow(row, options));
  }
  return lines.join(eol);
}

/** Serialize an array of records using an explicit column mapping. */
export function serializeObjectsToCsv<T extends Record<string, unknown>>(
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
  options: Omit<CsvSerializeOptions, "headers"> = {},
): string {
  const data = rows.map((row) =>
    columns.map((column) => {
      const value = row[column.key];
      return column.format ? column.format(value) : toCsvCell(value);
    }),
  );
  return serializeCsv(data, {
    ...options,
    headers: columns.map((column) => column.header),
  });
}
