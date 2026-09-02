/** ApexChain - Network Operations Intelligence Platform */
import { env } from "@/lib/config/env";
import axios, { type AxiosError, type AxiosRequestConfig, type AxiosRequestHeaders, type InternalAxiosRequestConfig, type AxiosHeaderValue } from "axios";
import { getCookie } from "@/lib/csrf";
import { normalizeApiError } from "@/lib/errors";
import { getBackoffDelay, parseRetryAfter, shouldRetry } from "@/lib/hermes";

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
// Allow requests to opt out of the Authorization header. Used by the
// cookie-only `/auth/session` check so a stale bearer token can never
// override a valid httpOnly session cookie.
declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

/**
 * Issue #294 — tokens are held in memory only, never in `document.cookie`,
 * sessionStorage or localStorage. A refresh token stored where JavaScript
 * can read it (a readable cookie or Web Storage) is exfiltratable by any
 * XSS payload; the
 * httpOnly session cookies set by the backend (see `/auth/session` and
 * `doRefresh` below) are the actual long-lived credential and are out of JS
 * reach by design.
 *
 * Consequences handled elsewhere:
 * - Hard refresh: in-memory tokens are gone, but the session is restored by
 *   the cookie-only `/auth/session` bootstrap (src/providers/session.tsx)
 *   and the httpOnly refresh cookie sent automatically by `doRefresh`.
 * - Cross-tab: authentication state is broadcast over the session-sync
 *   channel, not via shared cookies.
 */
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function getRefreshToken(): string | null {
  return memoryRefreshToken;
}

/**
 * Store tokens in memory only.
 * Issue #294: deliberately does NOT touch document.cookie — a test asserts
 * no token is ever written to a JS-readable cookie.
 */
export function setTokens(access: string, refresh: string): void {
  memoryAccessToken = access;
  memoryRefreshToken = refresh;
}

export function clearTokens(): void {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:logout"));
  }
  // Issue #294: sweep any legacy readable-token cookies left by earlier
  // versions so old sessions cannot linger and mask a valid httpOnly one.
  if (typeof document !== "undefined") {
    for (const name of LEGACY_COOKIE_KEYS) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
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

/** Readable-token cookies written by pre-#294 versions of setTokens(). */
export const LEGACY_COOKIE_KEYS = ["noc_access_token", "noc_refresh_token"];

export const api = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Attach CSRF token and access token to every request. Every authenticated
// call goes through this pipeline (Issue #293) — including the preferences
// sync in src/lib/preferences.ts — so CSRF headers, bearer auth, single-
// flight refresh and timeouts behave identically for all of them.
api.interceptors.request.use((config) => {
  if (config.timeout === undefined) {
    config.timeout = 15000;
  }
  const correlationId = typeof window !== "undefined" ? window.sessionStorage.getItem("noc_correlation_id") || (() => {
    const id = Math.random().toString(36).substring(7);
    window.sessionStorage.setItem("noc_correlation_id", id);
    return id;
  })() : "server-side";
  if (config.headers) {
    config.headers["X-Correlation-ID"] = correlationId;
  }
  const csrfToken = getCookie("apex_csrf");
  if (csrfToken && config.headers) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }

  // skipAuth: cookie-only requests (e.g. /auth/session) must not send a
  // bearer token — after a hard refresh the in-memory token is gone and a
  // stale cookie token could mask a still-valid httpOnly session.
  if (!config.skipAuth) {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Single-flight refresh state
let refreshPromise: Promise<string | null> | null = null;
// Track retried request IDs to prevent infinite loops
const retried = new WeakSet<object>();

interface RefreshResponse {
  access_token: string;
  /**
   * Present when the backend rotates refresh tokens; may be absent when it
   * keeps the same refresh token for the session lifetime.
   */
  refresh_token?: string;
}

async function doRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const res = await axios.post<RefreshResponse>(
    env.API_REFRESH_URL,
    { refresh_token: refreshToken },
    // Send cookies so the backend can also validate the httpOnly refresh
    // cookie when the token itself is not readable from JS.
    { withCredentials: true },
  );

  const newAccess = res.data.access_token ?? null;
  if (newAccess) {
    // Issue #295 — adopt the rotated refresh token when the backend issues
    // one. Presenting the stale token after rotation would make every
    // refresh after the first fail (server has invalidated it) and force a
    // logout. Only one writer runs at a time because doRefresh is invoked
    // under the single-flight refreshPromise, so the write is race-safe.
    if (res.data.refresh_token) {
      memoryRefreshToken = res.data.refresh_token;
    } else {
      memoryRefreshToken = refreshToken;
    }
    // Issue #295 — persist the renewed access token too. Without this only
    // the retried request sees the new token; every other request would
    // keep presenting the stale Bearer token and re-trigger the refresh
    // flow for the rest of the session.
    memoryAccessToken = newAccess;
  }
  return newAccess;
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

/**
 * A refresh failure is only definitive when the server explicitly rejected
 * the refresh (401/403). Network errors, timeouts and 5xx responses mean the
 * refresh could not be evaluated — clearing tokens in that case would destroy
 * a still-valid httpOnly session (e.g. right after a hard refresh).
 */
function isDefinitiveAuthFailure(err: unknown): boolean {
  const status = (err as AxiosError)?.response?.status;
  return status === 401 || status === 403;
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
    if (config.signal?.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }
    // Any method may recover through the refresh flow (Issue #293: an
    // authenticated preferences PUT must refresh and retry, not just GETs).
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
          const headers = {
            ...(config.headers ?? {}),
            Authorization: `Bearer ${newToken}`,
          } as AxiosRequestHeaders;
          config.headers = headers;
          return api.request(config);
        }
        clearTokens();
        return Promise.reject(new Error("Session expired. Please sign in again."));
      } catch (refreshErr) {
        if (isDefinitiveAuthFailure(refreshErr)) {
          clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return Promise.reject(new Error("Session expired. Please sign in again."));
        }
        // Transient failure — keep tokens/cookies intact so the session can
        // recover on the next attempt instead of being force-logged-out.
        return Promise.reject(normalizeApiError(refreshErr));
      }
    }

    // 2. Handle Exponential Backoff for Idempotent Reads (GET)
    if (shouldRetry(axiosErr)) {
      const attempt = (config as unknown as Record<string, unknown>)._retryCount as number ?? 0;
      (config as unknown as Record<string, unknown>)._retryCount = attempt + 1;

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
