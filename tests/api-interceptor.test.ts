/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/lib/api";

describe("401 interceptor chain", () => {
  beforeEach(() => {
    clearTokens();
    vi.restoreAllMocks();
  });

  it("attaches access token to requests", async () => {
    setTokens("test-access-token", "test-refresh-token");
    
    const requestInterceptor = api.interceptors.request.handlers[0];
    const config = { headers: {} as Record<string, string> };
    
    const result = requestInterceptor.fulfilled(config);
    
    expect(result.headers.Authorization).toBe("Bearer test-access-token");
  });

  it("returns null tokens when not in browser", () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("stores and retrieves tokens", () => {
    setTokens("access-123", "refresh-456");
    expect(getAccessToken()).toBe("access-123");
    expect(getRefreshToken()).toBe("refresh-456");
  });

  it("clears tokens", () => {
    setTokens("access-123", "refresh-456");
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
