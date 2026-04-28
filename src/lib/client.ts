import { buildApiUrl } from "@/lib/api/url";
import { normalizeApiError } from "@/lib/errors/normalizeApiError";

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

  return res.json();
}