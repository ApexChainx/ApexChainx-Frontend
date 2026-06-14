/** ApexChain Frontend Test Suite */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { useSession } from "@/hooks/useSession";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockClearTokens = vi.fn();
const mockGetAccessToken = vi.fn();
const mockSetTokens = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  clearTokens: () => mockClearTokens(),
  getAccessToken: () => mockGetAccessToken(),
  setTokens: (...args: unknown[]) => mockSetTokens(...args),
}));

const mockUser = {
  id: "u1",
  email: "op@example.com",
  role: "engineer",
};

describe("useSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGet.mockReset();
    mockPost.mockReset();
    mockClearTokens.mockReset();
    mockGetAccessToken.mockReset();
    mockSetTokens.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial authentication state", () => {
    it("authenticates when token exists and /auth/me succeeds", async () => {
      mockGetAccessToken.mockReturnValue("valid-token");
      mockGet.mockResolvedValue({ data: mockUser });

      const { result } = renderHook(() => useSession());

      expect(result.current.state).toBe("loading");

      await waitFor(() => {
        expect(result.current.state).toBe("authenticated");
      });

      expect(result.current.user).toEqual(mockUser);

      expect(mockGet).toHaveBeenCalledWith(
        "/auth/me",
        expect.any(Object),
      );
    });

    it("falls back to unauthenticated when /auth/me fails", async () => {
      mockGetAccessToken.mockReturnValue("expired-token");
      mockGet.mockRejectedValue(new Error("401 Unauthorized"));

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.state).toBe("unauthenticated");
      });

      expect(result.current.user).toBeNull();

      expect(mockClearTokens).toHaveBeenCalledTimes(1);
    });

    it("is unauthenticated when no token exists", async () => {
      mockGetAccessToken.mockReturnValue(null);

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.state).toBe("unauthenticated");
      });

      expect(result.current.user).toBeNull();

      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("storeSession", () => {
    it("stores session and updates authenticated state", async () => {
      mockGetAccessToken.mockReturnValue(null);

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.state).toBe("unauthenticated");
      });

      act(() => {
        result.current.storeSession(
          "access-token",
          "refresh-token",
          mockUser,
        );
      });

      expect(mockSetTokens).toHaveBeenCalledWith(
        "access-token",
        "refresh-token",
      );

      expect(result.current.state).toBe("authenticated");
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe("logout", () => {
    it("logs out successfully and clears session state", async () => {
      mockGetAccessToken.mockReturnValue("valid-token");

      mockGet.mockResolvedValue({
        data: mockUser,
      });

      mockPost.mockResolvedValue({});

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.state).toBe("authenticated");
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockPost).toHaveBeenCalledWith("/auth/logout");

      expect(mockClearTokens).toHaveBeenCalledTimes(1);

      expect(result.current.state).toBe("unauthenticated");
      expect(result.current.user).toBeNull();
    });

    it("still clears local session when logout API fails", async () => {
      mockGetAccessToken.mockReturnValue("valid-token");

      mockGet.mockResolvedValue({
        data: mockUser,
      });

      mockPost.mockRejectedValue(new Error("Network Error"));

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.state).toBe("authenticated");
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockClearTokens).toHaveBeenCalled();

      expect(result.current.state).toBe("unauthenticated");
      expect(result.current.user).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles malformed API response gracefully", async () => {
      mockGetAccessToken.mockReturnValue("token");

      mockGet.mockResolvedValue({
        data: null,
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.state).toBe("authenticated");
      });

      expect(result.current.user).toBeNull();
    });

    it("does not call clearTokens unnecessarily", async () => {
      mockGetAccessToken.mockReturnValue(null);

      renderHook(() => useSession());

      await waitFor(() => {
        expect(mockClearTokens).not.toHaveBeenCalled();
      });
    });
  });
});