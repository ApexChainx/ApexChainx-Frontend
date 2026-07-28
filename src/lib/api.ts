/** ApexChain - Network Operations Intelligence Platform */
import { env } from "@/lib/config/env";
import { getCookie } from "@/lib/csrf";
import { normalizeApiError } from "@/lib/errors";
import { getBackoffDelay, parseRetryAfter, shouldRetry } from "@/lib/hermes";
import axios, { type AxiosError, type AxiosRequestHeaders, type InternalAxiosRequestConfig } from "axios";

const requestCache = new Map<string, Promise<unknown>>();

export function dedupeByKey<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cachedPromise = requestCache.get(key);
  if (cachedPromise) {
    return cachedPromise as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    requestCache.delete(key);
  });
  requestCache.set(key, promise);
  return promise;
}
export const TOKEN_KEY = "noc_access_token";
export const REFRESH_KEY = "noc_refresh_token";

let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export function getAccessToken(): string | null {
  if (typeof document !== "undefined") {
    const token = getCookie(TOKEN_KEY);
    if (token) return token;
  }
  return memoryAccessToken;
}

export function getRefreshToken(): string | null {
  if (typeof document !== "undefined") {
    const token = getCookie(REFRESH_KEY);
    if (token) return token;
  }
  return memoryRefreshToken;
}

export function setTokens(access: string, refresh: string): void {
  memoryAccessToken = access;
  memoryRefreshToken = refresh;
  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(access)}; path=/; SameSite=Lax; Secure`;
    document.cookie = `${REFRESH_KEY}=${encodeURIComponent(refresh)}; path=/; SameSite=Lax; Secure`;
  }
}

export function clearTokens(): void {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:logout"));
  }
  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${REFRESH_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

export class CircuitBreaker {
  public state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  public failureCount = 0;
  public nextAttemptTime = 0;
  public failureThreshold: number;
  public cooldownMs: number;

  constructor(failureThreshold = 3, cooldownMs = 30000) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
  }

  public getState(): "CLOSED" | "OPEN" | "HALF_OPEN" {
    if (this.state === "OPEN" && Date.now() >= this.nextAttemptTime) {
      this.state = "HALF_OPEN";
    }
    return this.state;
  }

  public recordSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  public recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + this.cooldownMs;
    }
  }
}

export const refreshBreaker = new CircuitBreaker();

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
let refreshPromise: Promise<string | null> | null = null;
// Track retried request IDs to prevent infinite loops
const retried = new WeakSet<object>();

async function doRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const res = await axios.post<{ access_token: string; refresh_token: string }>(
    env.API_REFRESH_URL,
    { refresh_token: refreshToken },
  );
  return res.data.access_token ?? null;
}

async function doRefreshWithBreaker(): Promise<string> {
  const state = refreshBreaker.getState();
  if (state === "OPEN") {
    throw new Error("Circuit breaker is open");
  }

  try {
    const token = await doRefresh();
    refreshBreaker.recordSuccess();
    return token;
  } catch (err) {
    refreshBreaker.recordFailure();
    throw err;
  }
}

// Auto-refresh on 401 with single-flight dedup and circuit breaker + backoff for GET 5xx/429
api.interceptors.response.use(
  (res) => res,
  async (err: unknown) => {
    const axiosErr = err as AxiosError;
    const config = axiosErr?.config as InternalAxiosRequestConfig | undefined;

    if (!config) {
      return Promise.reject(normalizeApiError(err));
    }

    // 1. Handle 401 Authentication Refresh with Circuit Breaker
    if (axiosErr.response?.status === 401 && !retried.has(config)) {
      if (refreshBreaker.getState() === "OPEN") {
        clearTokens();
        return Promise.reject(
          normalizeApiError({
            response: {
              status: 401,
              data: { message: "Authentication service degraded. Circuit breaker is open." },
            },
          })
        );
      }

      retried.add(config);
      try {
        if (!refreshPromise) {
          refreshPromise = doRefreshWithBreaker().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        if (newToken) {
          const headers: AxiosRequestHeaders = {
            ...(config.headers ?? {}),
            Authorization: `Bearer ${newToken}`,
          };
          config.headers = headers;
          return api.request(config);
        }
        clearTokens();
        return Promise.reject(new Error("Session expired. Please sign in again."));
      } catch (refreshErr) {
        clearTokens();
        return Promise.reject(new Error("Session expired. Please sign in again."));
      }
    }

    // 2. Handle Exponential Backoff for Idempotent Reads (GET)
    if (shouldRetry(axiosErr)) {
      const attempt = config._retryCount ?? 0;
      config._retryCount = attempt + 1;

      let delay = getBackoffDelay(attempt);

      // Honor Retry-After header for 429
      if (axiosErr.response?.status === 429) {
        const retryAfterHeader = axiosErr.response.headers?.["retry-after"];
        const parsedDelay = parseRetryAfter(retryAfterHeader);
        if (parsedDelay !== null) {
          delay = parsedDelay;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      return api.request(config);
    }

    return Promise.reject(normalizeApiError(err));
  },
);
