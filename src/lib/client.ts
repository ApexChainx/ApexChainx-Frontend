/** ApexChain - Network Operations Intelligence Platform */
import { buildApiUrl } from "@/lib/url";
import { normalizeApiError } from "@/lib/errors";

export async function apiClient(
  path: string,
  options?: RequestInit
) {
  const url = buildApiUrl(path);

  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));

    throw normalizeApiError({
      response: {
        status: res.status,
        data,
        headers: {
          "x-correlation-id": res.headers.get("x-correlation-id"),
        },
      },
    });
  }

  // A 204 No Content (or any empty body) has no JSON payload to parse. Treat
  // it as a successful response with `undefined` rather than letting
  // `res.json()` reject with a SyntaxError that callers mistake for a failure.
  if (res.status === 204 || res.status === 205) {
    return undefined;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType && !contentType.includes("application/json")) {
    return undefined;
  }

  return res.json();
}