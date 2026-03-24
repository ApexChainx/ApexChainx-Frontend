"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getOutages } from "@/services/outages";
import type { Outage } from "@/types/outages";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load outages";
}

// Existing state manager
export function useOutagesTableState() {
  const params = useSearchParams();
  const router = useRouter();

  const page = Number(params?.get("page") ?? 1);
  const severity = params?.get("severity") ?? undefined;

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(params?.toString() ?? "");

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

// New data fetching & polling hook for the Outages list
export function useOutagesList(page: number, severity?: string) {
  const [outages, setOutages] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isFetching = useRef(false);
  const hasOutagesRef = useRef(false);

  useEffect(() => {
    hasOutagesRef.current = outages.length > 0;
  }, [outages]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchList = async () => {
      if (isFetching.current) return;
      isFetching.current = true;

      try {
        const data = await getOutages({ page, severity });
        if (isMounted) {
          setOutages(data.items);
          setError(null);
        }
      } catch (error: unknown) {
        if (isMounted && !hasOutagesRef.current) {
          setError(getErrorMessage(error));
        }
      } finally {
        isFetching.current = false;
        if (isMounted) setLoading(false);
      }
    };

    fetchList();

    // The list page constantly polls every 15 seconds to ensure we 
    // catch any newly generated incidents as well as updates to existing ones.
    const intervalId = setInterval(fetchList, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [page, severity]);

  return { outages, loading, error };
}
