"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type SessionState = "loading" | "authenticated" | "unauthenticated";

interface SessionUser {
  id: string;
  email: string;
}

export function useSession() {
  const [state, setState] = useState<SessionState>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let isMounted = true;
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
    }
  }

  return { state, user, logout };
}
