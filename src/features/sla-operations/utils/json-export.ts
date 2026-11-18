/** ApexChain Network Operations Intelligence Platform */
/**
 * JSON export utilities (Issue #922).
 *
 * Pure helpers for building deterministic JSON export payloads. Object keys
 * are sorted recursively so the same input always produces byte-identical
 * output, which makes exports reproducible and diffable.
 */

/** Descriptive metadata attached to a JSON export. */
export interface JsonExportMeta {
  /** Identifier of the exporting workspace/dataset. */
  source: string;
  /** ISO-8601 timestamp the export was generated. */
  generatedAt: string;
  /** Payload schema version. Defaults to 1. */
  schemaVersion?: number | undefined;
}

/** Envelope returned by `buildJsonExport`. */
export interface JsonExportEnvelope<T> {
  schemaVersion: number;
  source: string;
  generatedAt: string;
  data: T;
}

function normalizeForSerialization(
  value: unknown,
  seen: WeakSet<object>,
): unknown {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      return null;
    }
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (seen.has(value)) {
    throw new TypeError("Cannot serialize a circular structure");
  }
  seen.add(value);

  if (Array.isArray(value)) {
    const normalized = value.map((item) => normalizeForSerialization(item, seen));
    seen.delete(value);
    return normalized;
  }

  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    const normalized = normalizeForSerialization(record[key], seen);
    if (normalized === undefined) {
      continue;
    }
    result[key] = normalized;
  }
  seen.delete(value);
  return result;
}

/**
 * Serialize a value to JSON with recursively sorted object keys.
 *
 * Non-finite numbers become `null`, `Date` instances become ISO strings and
 * circular references throw a `TypeError` rather than recursing forever.
 */
export function stableSerialize(value: unknown): string {
  return JSON.stringify(normalizeForSerialization(value, new WeakSet<object>())) ?? "null";
}

/** Wrap data in a versioned export envelope. */
export function buildJsonExport<T>(
  data: T,
  meta: JsonExportMeta,
): JsonExportEnvelope<T> {
  return {
    schemaVersion: meta.schemaVersion ?? 1,
    source: meta.source,
    generatedAt: meta.generatedAt,
    data,
  };
}

/** Build and deterministically serialize an export payload. */
export function serializeJsonExport<T>(data: T, meta: JsonExportMeta): string {
  return stableSerialize(buildJsonExport(data, meta));
}

/** Derive a safe, deterministic download file name for an export. */
export function createJsonFileName(source: string, generatedAt: string): string {
  const safeSource =
    source
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "export";
  return `${safeSource}-${generatedAt.slice(0, 10)}.json`;
}
