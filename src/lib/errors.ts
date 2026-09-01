/** ApexChain - Network Operations Intelligence Platform */

export type ApiErrorKind =
  | "auth"
  | "validation"
  | "conflict"
  | "rate_limit"
  | "not_found"
  | "unknown";

export interface NormalizedApiError {
  message: string;
  kind: ApiErrorKind;
  status?: number | undefined;
  correlationId?: string | undefined;
}

export function normalizeApiError(err: unknown): NormalizedApiError {
  const e = err as {
    response?: {
      status?: number;
      data?: {
        detail?: string | { msg: string }[];
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
  let message = "Unexpected API error";
  if (rawDetail) {
    if (Array.isArray(rawDetail)) {
      message = rawDetail.map((d) => d.msg).join("; ");
    } else if (typeof rawDetail === "string") {
      message = rawDetail;
    } else if (typeof rawDetail === "object" && rawDetail !== null) {
      message = (rawDetail as any).message || (rawDetail as any).detail || JSON.stringify(rawDetail);
    }
  } else {
    message = e?.response?.data?.message ?? e?.message ?? "Unexpected API error";
  }

  const kind: ApiErrorKind =
    status === 401 || status === 403
      ? "auth"
      : status === 422
        ? "validation"
        : status === 409
          ? "conflict"
          : status === 429
            ? "rate_limit"
            : status === 404
              ? "not_found"
              : "unknown";

  return { message, kind, status, correlationId };
}

// aligned api errors schema
