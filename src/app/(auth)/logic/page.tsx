"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { saveRedirect } from "@/lib/auth/redirectStorage";
import { REDIRECT_KEY } from "@/lib/auth/redirect";

export default function LoginPage() {
  const params = useSearchParams();

  useEffect(() => {
    const redirect = params.get(REDIRECT_KEY);
    if (redirect) {
      saveRedirect(redirect);
    }
  }, [params]);

  return <LoginForm />;
}