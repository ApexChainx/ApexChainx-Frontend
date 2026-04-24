"use client";

import { useEffect, useState } from "react";
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

export function useSession() {
  const [state, setState] = useState<SessionState>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);

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

    api
      .get<SessionUser>("/auth/me")
      .then((res) => {
        if (isMounted) {
          setUser(res.data);
          setState("authenticated");
        }
      })
      .catch(() => {
        if (isMounted) {
          clearTokens();
          setUser(null);
          setState("unauthenticated");
        }
      });

    return () => {
      isMounted = false;
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
    }
  }

  return { state, user, logout, storeSession };
}
