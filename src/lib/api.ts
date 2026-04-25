import axios from "axios";

export const TOKEN_KEY = "noc_access_token";
export const REFRESH_KEY = "noc_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export const api = axios.create({
  baseURL: "http://localhost:8000/api/v1/",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Attach stored access token to every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh state
let refreshPromise: Promise<string> | null = null;
// Track retried request IDs to prevent infinite loops
const retried = new WeakSet<object>();

async function doRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const res = await axios.post<{ access_token: string; refresh_token: string }>(
    "http://localhost:8000/api/v1/auth/refresh",
    { refresh_token: refreshToken },
  );
  setTokens(res.data.access_token, res.data.refresh_token);
  return res.data.access_token;
}

// Auto-refresh on 401 with single-flight dedup
api.interceptors.response.use(
  (res) => res,
  async (err: unknown) => {
    const axiosErr = err as { response?: { status?: number }; config?: object };
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config as any).headers = { ...((config as any).headers ?? {}), Authorization: `Bearer ${newToken}` };
        return api(config as Parameters<typeof api>[0]);
      } catch {
        clearTokens();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:logout"));
        }
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
