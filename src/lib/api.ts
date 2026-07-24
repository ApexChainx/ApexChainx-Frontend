/** ApexChain - Network Operations Intelligence Platform */
import axios, { type InternalAxiosRequestConfig } from "axios";
import { normalizeApiError } from "@/lib/errors";
import { env } from "@/lib/config/env";

export const TOKEN_KEY = "noc_access_token";
export const REFRESH_KEY = "noc_refresh_token";

// With httpOnly cookies, tokens are not accessible via JavaScript.
// These functions exist for backward compatibility but are no-ops.
export function getAccessToken(): string | null {
  return null;
}

export function getRefreshToken(): string | null {
  return null;
}

export function setTokens(_access: string, _refresh: string): void {
  // No-op: backend sets httpOnly cookies via Set-Cookie headers.
}

export function clearTokens(): void {
  // No-op: backend clears cookies via Set-Cookie headers on logout.
  // Dispatch the logout event to clear client-side session state.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:logout"));
  }
}

export const api = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// No request interceptor needed — httpOnly cookies are sent automatically.

// Single-flight refresh state
let refreshPromise: Promise<string | null> | null = null;
// Track retried request IDs to prevent infinite loops
const retried = new WeakSet<object>();

async function doRefresh(): Promise<string | null> {
  // Rely on httpOnly refresh cookie — no token in request body.
  const res = await axios.post<{ access_token?: string }>(
    env.API_REFRESH_URL,
    {},
    { withCredentials: true },
  );
  return res.data.access_token ?? null;
}

// Auto-refresh on 401 with single-flight dedup
api.interceptors.response.use(
  (res) => res,
  async (err: unknown) => {
    const axiosErr = err as { response?: { status?: number }; config?: InternalAxiosRequestConfig };
    const config = axiosErr?.config;

    if (axiosErr?.response?.status === 401 && config && !retried.has(config)) {
      retried.add(config);
      try {
        if (!refreshPromise) {
          refreshPromise = doRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        if (newToken) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (config as any).headers = { ...((config as any).headers ?? {}), Authorization: `Bearer ${newToken}` };
          return api.request(config);
        }
        // Refresh failed — session expired.
        clearTokens();
        return Promise.reject(new Error("Session expired. Please sign in again."));
      } catch {
        clearTokens();
        return Promise.reject(new Error("Session expired. Please sign in again."));
      }
    }

    return Promise.reject(normalizeApiError(err));
  },
);

export type ApiErrorKind = "auth" | "validation" | "not_found" | "unknown";

export interface NormalizedApiError {
  message: string;
  kind: ApiErrorKind;
  status?: number;
}

export function normalizeApiError(err: unknown): NormalizedApiError {
  const e = err as {
    response?: { status?: number; data?: { detail?: string | { msg: string }[]; message?: string } };
    message?: string;
  };
  const status = e?.response?.status;
  const detail = e?.response?.data?.detail;
  const message =
    Array.isArray(detail)
      ? detail.map((d) => d.msg).join("; ")
      : detail ?? e?.response?.data?.message ?? e?.message ?? "Unexpected API error";

  const kind: ApiErrorKind =
    status === 401 || status === 403
      ? "auth"
      : status === 422
        ? "validation"
        : status === 404
          ? "not_found"
          : "unknown";

  return { message, kind, status };
}
