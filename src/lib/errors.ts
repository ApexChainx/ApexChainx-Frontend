/** ApexChain - Network Operations Intelligence Platform */

export type ApiErrorKind = "auth" | "validation" | "not_found" | "unknown";

export interface NormalizedApiError {
  message: string;
  kind: ApiErrorKind;
  status?: number | undefined;
  correlationId?: string | undefined;
  /**
   * Field-keyed validation errors derived from a FastAPI 422 `detail` array.
   * Keys are the form-field names mapped from each `loc` (e.g. `site_name`,
   * `details.url`); values are the per-field messages. Absent when the error
   * is not a structured validation payload.
   */
  fieldErrors?: Record<string, string[]> | undefined;
}

interface FastApiDetail {
  loc?: (string | number)[] | undefined;
  msg: string;
}

/**
 * Map a FastAPI `loc` array to a form-field key.
 *
 * FastAPI validation locs are `[source, ...fieldPath]` where `source` is one
 * of `body`, `query`, `path`, `header` or `cookie`. The source segment is
 * dropped and the remaining field path is joined with `.` so nested fields
 * keep their structure:
 *   ["body", "site_name"]            -> "site_name"
 *   ["query", "date_from"]           -> "date_from"
 *   ["body", "affected", "site_name"] -> "affected.site_name"
 */
export function locToField(loc: (string | number)[] | undefined): string | null {
  if (!loc || loc.length < 2) return null;
  const field = loc.slice(1).map((seg) => String(seg)).filter(Boolean);
  return field.length > 0 ? field.join(".") : null;
}

export function normalizeApiError(err: unknown): NormalizedApiError {
  const e = err as {
    response?: {
      status?: number;
      data?: {
        detail?: string | FastApiDetail[];
        message?: string;
        correlationId?: string;
        requestId?: string;
      };
      headers?: Record<string, string | null | undefined>;
    };
    message?: string;
  };

  const status = e?.response?.status;

  const correlationId =
    e?.response?.headers?.["x-correlation-id"] ??
    e?.response?.data?.correlationId ??
    e?.response?.data?.requestId;

  const rawDetail = e?.response?.data?.detail;

  let fieldErrors: Record<string, string[]> | undefined;
  const isArrayDetail = Array.isArray(rawDetail);

  const message = isArrayDetail
    ? (rawDetail as FastApiDetail[]).map((d) => d.msg).join("; ")
    : typeof rawDetail === "string"
      ? rawDetail
      : e?.response?.data?.message ??
        e?.message ??
        "Unexpected API error";

  // Derive the field-keyed map from the structured FastAPI 422 payload while
  // still producing the flattened message fallback.
  if (isArrayDetail) {
    for (const d of rawDetail as FastApiDetail[]) {
      const field = locToField(d.loc);
      if (!field) continue;
      (fieldErrors ??= {})[field] ??= [];
      fieldErrors[field].push(d.msg);
    }
  }

  const kind: ApiErrorKind =
    status === 401 || status === 403
      ? "auth"
      : status === 422
        ? "validation"
        : status === 404
          ? "not_found"
          : "unknown";

  return { message, kind, status, correlationId, ...(fieldErrors ? { fieldErrors } : {}) };
}
