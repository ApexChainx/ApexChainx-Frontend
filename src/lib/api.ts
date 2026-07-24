/** ApexChain - Network Operations Intelligence Platform */
import axios, { type InternalAxiosRequestConfig } from "axios";
import { getCookie } from "@/lib/csrf";
import { normalizeApiError } from "@/lib/errors";
import { env } from "@/lib/config/env";

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
  baseURL: env.API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Attach CSRF token and access token to every request
api.interceptors.request.use((config) => {
  const csrfToken = getCookie("apex_csrf");
  if (csrfToken && config.headers) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }

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
    env.API_REFRESH_URL,
    { refresh_token: refreshToken },
  );
  setTokens(res.data.access_token, res.data.refresh_token);
  return res.data.access_token;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config as any).headers = { ...((config as any).headers ?? {}), Authorization: `Bearer ${newToken}` };
        return api.request(config);
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
