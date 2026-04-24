"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export type SessionState = "loading" | "authenticated" | "unauthenticated";

interface SessionUser {
  id: string;
  email: string;
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
    api
      .get<SessionUser>("/auth/me")
      .then((res) => {
        if (isMounted) {
          setUser(res.data);
          setState("authenticated");
          // Broadcast to other tabs
          channelRef.current?.postMessage({
            type: "authenticated",
            user: res.data,
          } satisfies SessionMessage);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setState("unauthenticated");
        }
      });
    return () => { isMounted = false; };
  }, []);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
      setState("unauthenticated");
      // Broadcast logout to other tabs (FE-057)
      channelRef.current?.postMessage({ type: "logout" } satisfies SessionMessage);
    }
  }

  return { state, user, logout };
}
