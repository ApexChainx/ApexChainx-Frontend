"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  api,
  clearTokens,
  getAccessToken,
  setTokens,
} from "@/lib/api";

export type SessionState =
  | "loading"
  | "authenticated"
  | "unauthenticated";

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  full_name?: string | null;
  stellar_wallet?: string | null;
  created_at?: string;
}

interface SessionContextValue {
  state: SessionState;
  user: SessionUser | null;
  isAuthenticated: boolean;

  logout: () => Promise<void>;

  storeSession: (
    accessToken: string,
    refreshToken: string,
    user: SessionUser
  ) => void;

  refreshSession: () => Promise<void>;
}

const SessionContext =
  createContext<SessionContextValue | null>(null);

const CHANNEL_NAME = "apexchain_session";

type SessionMessage =
  | { type: "logout" }
  | { type: "authenticated"; user: SessionUser };

function isBrowser() {
  return typeof window !== "undefined";
}

function createBroadcastChannel() {
  if (!isBrowser() || !("BroadcastChannel" in window)) {
    return null;
  }

  return new BroadcastChannel(CHANNEL_NAME);
}

export function SessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] =
    useState<SessionState>("loading");

  const [user, setUser] =
    useState<SessionUser | null>(null);

  const channelRef =
    useRef<BroadcastChannel | null>(null);

  const mountedRef = useRef(true);

  /**
   * -------------------------
   * Helpers
   * -------------------------
   */

  const setAuthenticated = useCallback(
    (sessionUser: SessionUser) => {
      setUser(sessionUser);
      setState("authenticated");
    },
    []
  );

  const clearSession = useCallback(() => {
    clearTokens();
    setUser(null);
    setState("unauthenticated");
  }, []);

  /**
   * -------------------------
   * Cross-tab sync
   * -------------------------
   */

  useEffect(() => {
    const channel = createBroadcastChannel();

    if (!channel) return;

    channelRef.current = channel;

    channel.onmessage = (
      event: MessageEvent<SessionMessage>
    ) => {
      const message = event.data;

      switch (message.type) {
        case "logout":
          clearSession();
          break;

        case "authenticated":
          setAuthenticated(message.user);
          break;

        default:
          break;
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [clearSession, setAuthenticated]);

  /**
   * -------------------------
   * Refresh Session
   * -------------------------
   */

  const refreshSession = useCallback(async () => {
    try {
      const response = await api.get<SessionUser>(
        "/auth/me"
      );

      if (!mountedRef.current) return;

      setAuthenticated(response.data);

      channelRef.current?.postMessage({
        type: "authenticated",
        user: response.data,
      } satisfies SessionMessage);
    } catch (error) {
      console.error(
        "Failed to refresh session:",
        error
      );

      if (!mountedRef.current) return;

      clearSession();
    }
  }, [clearSession, setAuthenticated]);

  /**
   * -------------------------
   * Bootstrap Session
   * -------------------------
   */

  useEffect(() => {
    mountedRef.current = true;

    if (!isBrowser()) return;

    const controller = new AbortController();

    async function bootstrapSession() {
      try {
        const token = getAccessToken();

        if (!token) {
          setState("unauthenticated");
          return;
        }

        const response = await api.get<SessionUser>(
          "/auth/me",
          {
            signal: controller.signal,
          } as Parameters<typeof api.get>[1]
        );

        if (!mountedRef.current) return;

        setAuthenticated(response.data);
      } catch (error: unknown) {
        if (
          (error as { name?: string }).name ===
          "CanceledError"
        ) {
          return;
        }

        console.error(
          "Session bootstrap failed:",
          error
        );

        if (!mountedRef.current) return;

        clearSession();
      }
    }

    bootstrapSession();

    function handleLogoutEvent() {
      clearSession();
    }

    window.addEventListener(
      "auth:logout",
      handleLogoutEvent
    );

    return () => {
      mountedRef.current = false;

      controller.abort();

      window.removeEventListener(
        "auth:logout",
        handleLogoutEvent
      );
    };
  }, [clearSession, setAuthenticated]);

  /**
   * -------------------------
   * Store Session
   * -------------------------
   */

  const storeSession = useCallback(
    (
      accessToken: string,
      refreshToken: string,
      sessionUser: SessionUser
    ) => {
      setTokens(accessToken, refreshToken);

      setAuthenticated(sessionUser);

      channelRef.current?.postMessage({
        type: "authenticated",
        user: sessionUser,
      } satisfies SessionMessage);
    },
    [setAuthenticated]
  );

  /**
   * -------------------------
   * Logout
   * -------------------------
   */

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error(
        "Logout request failed:",
        error
      );
    } finally {
      clearSession();

      channelRef.current?.postMessage({
        type: "logout",
      } satisfies SessionMessage);
    }
  }, [clearSession]);

  /**
   * -------------------------
   * Memoized Context
   * -------------------------
   */

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      user,

      isAuthenticated:
        state === "authenticated",

      logout,

      storeSession,

      refreshSession,
    }),
    [
      state,
      user,
      logout,
      storeSession,
      refreshSession,
    ]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * -------------------------
 * Hook
 * -------------------------
 */

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error(
      "useSession must be used within SessionProvider"
    );
  }

  return context;
}