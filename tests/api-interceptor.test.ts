/** ApexChain Network Operations Intelligence Platform */
/**
 * Token storage + 401 refresh pipeline tests.
 *
 * Covers the invariants introduced by Issues #294 and #295:
 * - #294: tokens live in memory only — never in a JS-readable cookie.
 * - #294: clearTokens sweeps legacy readable-token cookies.
 * - #295: a rotated refresh_token from the refresh response is adopted and
 *   presented on the next refresh (two sequential refreshes).
 * - #295: the renewed access token is persisted for all later requests, not
 *   just the one that triggered the refresh.
 * - #293: the refresh flow is not limited to safe methods, so an
 *   authenticated PUT (e.g. preferences sync) recovers on 401.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

import {
  api,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  LEGACY_COOKIE_KEYS,
  setTokens,
} from "@/lib/api";

/** Read a cookie value the way an XSS payload would — this must find nothing. */
function getCookieValue(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function clearAllCookies(): void {
  for (const pair of document.cookie.split("; ")) {
    const name = pair.split("=")[0];
    if (name) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

/** Drive the request interceptor directly (single registered interceptor). */
function runRequestInterceptor(config: Record<string, unknown>): Record<string, any> {
  const interceptor = (api.interceptors.request as any).handlers[0];
  return interceptor.fulfilled(config).headers;
}

/** Build an AxiosError-shaped 401 rejection for the response interceptor. */
function make401(config: Record<string, unknown>): unknown {
  return Object.assign(new Error("Request failed with status code 401"), {
    isAxiosError: true,
    config: { headers: {}, ...config },
    response: { status: 401, data: {}, headers: {} },
  });
}

/** Build an AxiosError-shaped rejection with an arbitrary status. */
function makeAxiosAuthError(status: number): unknown {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    config: {},
    response: { status, data: {}, headers: {} },
  });
}

/** The response interceptor's rejection handler (fulfilled is res => res). */
function responseErrorHandler(): (err: unknown) => Promise<unknown> {
  return (api.interceptors.response as any).handlers[0].rejected;
}

describe("token storage (#294)", () => {
  beforeEach(() => {
    clearTokens();
    clearAllCookies();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches the in-memory access token to requests", () => {
    setTokens("access-123", "refresh-456");
    const headers = runRequestInterceptor({ headers: {} });
    expect(headers.Authorization).toBe("Bearer access-123");
  });

  it("keeps tokens readable only through the module accessors", () => {
    setTokens("access-123", "refresh-456");
    expect(getAccessToken()).toBe("access-123");
    expect(getRefreshToken()).toBe("refresh-456");
  });

  it("never writes a JS-readable token cookie (XSS cannot exfiltrate)", () => {
    setTokens("access-123", "refresh-456");

    // Nothing written by setTokens may appear in document.cookie…
    expect(document.cookie).not.toContain("access-123");
    expect(document.cookie).not.toContain("refresh-456");
    // …including under the legacy cookie names.
    expect(getCookieValue("noc_access_token")).toBeNull();
    expect(getCookieValue("noc_refresh_token")).toBeNull();
  });

  it("sweeps legacy readable-token cookies left by older builds", () => {
    // Simulate cookies persisted by the pre-#294 setTokens().
    document.cookie = "noc_access_token=stale-access; path=/";
    document.cookie = "noc_refresh_token=stale-refresh; path=/";

    clearTokens();

    for (const name of LEGACY_COOKIE_KEYS) {
      expect(getCookieValue(name)).toBeNull();
    }
  });

  it("clears memory tokens on clearTokens", () => {
    setTokens("access-123", "refresh-456");
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("omits Authorization for skipAuth requests (cookie-only /auth/session)", () => {
    setTokens("access-123", "refresh-456");
    const headers = runRequestInterceptor({ headers: {}, skipAuth: true });
    expect(headers.Authorization).toBeUndefined();
  });

  it("attaches the CSRF token from the apex_csrf cookie", () => {
    document.cookie = "apex_csrf=csrf-token-xyz; path=/";
    const headers = runRequestInterceptor({ headers: {} });
    expect(headers["X-CSRF-Token"]).toBe("csrf-token-xyz");
  });
});

describe("401 refresh pipeline (#295)", () => {
  let postSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearTokens();
    clearAllCookies();
    postSpy = vi.spyOn(axios, "post");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adopts the rotated refresh token and presents it on the next refresh", async () => {
    setTokens("stale-access", "stale-refresh");
    vi.spyOn(api, "request").mockResolvedValue({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    } as any);

    const errorHandler = responseErrorHandler();

    // First refresh: the backend rotates the refresh token.
    postSpy.mockResolvedValueOnce({
      status: 200,
      data: { access_token: "access-2", refresh_token: "rotated-refresh" },
    });
    await errorHandler(make401({ method: "get", url: "/outages" }));

    expect(postSpy).toHaveBeenCalledWith(
      expect.stringContaining("/auth/refresh"),
      { refresh_token: "stale-refresh" },
      { withCredentials: true },
    );
    expect(getRefreshToken()).toBe("rotated-refresh");
    expect(getAccessToken()).toBe("access-2");

    // Second refresh must present the ROTATED token — the stale one would
    // have been invalidated server-side and forced a logout.
    postSpy.mockResolvedValueOnce({
      status: 200,
      data: { access_token: "access-3", refresh_token: "rotated-refresh-3" },
    });
    await errorHandler(make401({ method: "get", url: "/outages" }));

    expect(postSpy).toHaveBeenLastCalledWith(
      expect.stringContaining("/auth/refresh"),
      { refresh_token: "rotated-refresh" },
      { withCredentials: true },
    );
    expect(getRefreshToken()).toBe("rotated-refresh-3");
    expect(getAccessToken()).toBe("access-3");
  });

  it("keeps the same refresh token when the backend does not rotate", async () => {
    setTokens("stale-access", "unchanged-refresh");
    vi.spyOn(api, "request").mockResolvedValue({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    } as any);

    const errorHandler = responseErrorHandler();

    postSpy.mockResolvedValueOnce({ status: 200, data: { access_token: "access-2" } });
    await errorHandler(make401({ method: "get", url: "/outages" }));
    expect(getRefreshToken()).toBe("unchanged-refresh");

    postSpy.mockResolvedValueOnce({ status: 200, data: { access_token: "access-3" } });
    await errorHandler(make401({ method: "get", url: "/outages" }));
    expect(postSpy).toHaveBeenLastCalledWith(
      expect.stringContaining("/auth/refresh"),
      { refresh_token: "unchanged-refresh" },
      { withCredentials: true },
    );
  });

  it("persists the renewed access token for all subsequent requests", async () => {
    setTokens("stale-access", "refresh-1");
    const requestSpy = vi.spyOn(api, "request").mockResolvedValue({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    } as any);

    postSpy.mockResolvedValueOnce({
      status: 200,
      data: { access_token: "access-2", refresh_token: "refresh-2" },
    });

    await responseErrorHandler()(make401({ method: "get", url: "/outages" }));

    // The retried request carried the fresh bearer token…
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect((requestSpy.mock.calls[0]![0] as any).headers.Authorization).toBe("Bearer access-2");

    // …and so does every request made afterwards (not just the retried one).
    const headers = runRequestInterceptor({ headers: {} });
    expect(headers.Authorization).toBe("Bearer access-2");
  });

  it("recovers an authenticated PUT through the refresh flow (#293)", async () => {
    setTokens("stale-access", "refresh-1");
    const requestSpy = vi.spyOn(api, "request").mockResolvedValue({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    } as any);

    postSpy.mockResolvedValueOnce({ status: 200, data: { access_token: "access-2" } });

    await responseErrorHandler()(
      make401({ method: "put", url: "/user/preferences" }),
    );

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("access-2");
  });

  it("clears tokens and rejects when the refresh endpoint definitively rejects", async () => {
    setTokens("access-1", "refresh-1");
    postSpy.mockRejectedValueOnce(makeAxiosAuthError(401));

    await expect(
      responseErrorHandler()(make401({ method: "get", url: "/outages" })),
    ).rejects.toThrow("Session expired. Please sign in again.");

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("keeps tokens when the refresh fails transiently (network error)", async () => {
    setTokens("access-1", "refresh-1");
    postSpy.mockRejectedValueOnce(new Error("network down"));

    await expect(
      responseErrorHandler()(make401({ method: "get", url: "/outages" })),
    ).rejects.toMatchObject({ kind: "unknown", message: "network down" });

    // A transient refresh failure must not destroy a possibly-valid session.
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
  });
});
