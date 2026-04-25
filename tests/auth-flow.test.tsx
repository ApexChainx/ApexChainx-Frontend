import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSession } from "@/hooks/useSession";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockClearTokens = vi.fn();
const mockGetAccessToken = vi.fn();
const mockSetTokens = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
  clearTokens: () => mockClearTokens(),
  getAccessToken: () => mockGetAccessToken(),
  setTokens: (...a: unknown[]) => mockSetTokens(...a),
}));

const user = { id: "u1", email: "op@example.com", role: "engineer" };

describe("useSession", () => {
  beforeEach(() => {
    mockGet.mockReset(); mockPost.mockReset();
    mockClearTokens.mockReset(); mockGetAccessToken.mockReset(); mockSetTokens.mockReset();
  });

  it("authenticates when token exists and /auth/me succeeds", async () => {
    mockGetAccessToken.mockReturnValue("tok");
    mockGet.mockResolvedValue({ data: user });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.state).toBe("authenticated"));
    expect(result.current.user?.email).toBe("op@example.com");
  });

  it("falls back to unauthenticated when /auth/me fails", async () => {
    mockGetAccessToken.mockReturnValue("tok");
    mockGet.mockRejectedValue(new Error("401"));
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.state).toBe("unauthenticated"));
    expect(mockClearTokens).toHaveBeenCalled();
  });

  it("is unauthenticated with no stored token", async () => {
    mockGetAccessToken.mockReturnValue(null);
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.state).toBe("unauthenticated"));
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("storeSession sets authenticated state", async () => {
    mockGetAccessToken.mockReturnValue(null);
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.state).toBe("unauthenticated"));
    act(() => result.current.storeSession("at", "rt", user));
    expect(result.current.state).toBe("authenticated");
    expect(mockSetTokens).toHaveBeenCalledWith("at", "rt");
  });

  it("logout clears state", async () => {
    mockGetAccessToken.mockReturnValue("tok");
    mockGet.mockResolvedValue({ data: user });
    mockPost.mockResolvedValue({});
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.state).toBe("authenticated"));
    await act(() => result.current.logout());
    expect(result.current.state).toBe("unauthenticated");
    expect(result.current.user).toBeNull();
  });
});
