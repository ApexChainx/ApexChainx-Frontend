"use client";

import { useEffect, useRef, useState } from "react";
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

type SessionMessage =
  | { type: "logout" }
  | { type: "authenticated"; user: SessionUser };

const CHANNEL_NAME = "noc_iq_session";

export function useSession() {
  const [state, setState] = useState<SessionState>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Open BroadcastChannel for cross-tab sync (FE-057)
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

  useEffect(() => {
    let isMounted = true;

    function handleAuthLogout() {
      if (isMounted) {
        setUser(null);
        setState("unauthenticated");
      }
    }

    window.addEventListener("auth:logout", handleAuthLogout);

    // Restore session if a token is already stored
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
          channelRef.current?.postMessage({
            type: "authenticated",
            user: res.data,
          } satisfies SessionMessage);
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
      // Broadcast logout to other tabs (FE-057)
      channelRef.current?.postMessage({ type: "logout" } satisfies SessionMessage);
    }
  }

  return { state, user, logout, storeSession };
}
