"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { api, clearTokens, getAccessToken, setTokens } from "@/lib/api";

export type SessionState = "loading" | "authenticated" | "unauthenticated";

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
  logout: () => Promise<void>;
  storeSession: (accessToken: string, refreshToken: string, user: SessionUser) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionMessage =
  | { type: "logout" }
  | { type: "authenticated"; user: SessionUser };

const CHANNEL_NAME = "noc_iq_session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Cross-tab sync
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<SessionMessage>) => {
      const msg = event.data;
      if (msg.type === "logout") {
        setUser(null);
        setState("unauthenticated");
      } else if (msg.type === "authenticated") {
        setUser(msg.user);
        setState("authenticated");
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Bootstrap session once on mount
  useEffect(() => {
    let isMounted = true;

    function handleAuthLogout() {
      if (isMounted) {
        setUser(null);
        setState("unauthenticated");
      }
    }

    window.addEventListener("auth:logout", handleAuthLogout);

    if (!getAccessToken()) {
      setState("unauthenticated");
      return () => {
        isMounted = false;
        window.removeEventListener("auth:logout", handleAuthLogout);
      };
    }

    const controller = new AbortController();

    api
      .get<SessionUser>("/auth/me", { signal: controller.signal } as Parameters<typeof api.get>[1])
      .then((res) => {
        if (isMounted) {
          setUser(res.data);
          setState("authenticated");
          channelRef.current?.postMessage({ type: "authenticated", user: res.data } satisfies SessionMessage);
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "CanceledError") return;
        if (isMounted) {
          clearTokens();
          setUser(null);
          setState("unauthenticated");
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, []);

  function storeSession(accessToken: string, refreshToken: string, sessionUser: SessionUser) {
    setTokens(accessToken, refreshToken);
    setUser(sessionUser);
    setState("authenticated");
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      clearTokens();
      setUser(null);
      setState("unauthenticated");
      channelRef.current?.postMessage({ type: "logout" } satisfies SessionMessage);
    }
  }

  return (
    <SessionContext.Provider value={{ state, user, logout, storeSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
