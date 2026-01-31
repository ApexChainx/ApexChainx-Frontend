"use client";

import { useSearchParams, useRouter } from "next/navigation";

export function useOutagesTableState() {
  const params = useSearchParams();
  const router = useRouter();

  const page = Number(params.get("page") ?? 1);
  const severity = params.get("severity") ?? undefined;

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(params.toString());

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    router.push(`?${next.toString()}`);
  }

  return {
    state: {
      page,
      severity,
    },
    actions: {
      setParam,
    },
  };
}
