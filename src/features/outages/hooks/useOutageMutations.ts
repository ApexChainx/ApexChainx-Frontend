import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteOutage, getOutage, resolveOutage } from "@/services/outages";
import { slaEventKeys } from "@/lib/query-keys";
import { useInvalidateOutageChange } from "./useInvalidateOutageChange";

/**
 * Re-export slaEventKeys.outages as outageKeys so existing imports continue
 * to work without changes. All consumers get the full SLA_EVENTS key family.
 */
export const outageKeys = slaEventKeys.outages;

export function useOutage(id: string) {
  return useQuery({
    queryKey: slaEventKeys.outages.detail(id),
    queryFn: () => getOutage(id),
    enabled: !!id,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) =>
      query.state.data?.status === "resolved" ? false : 30_000,
  });
}

export function useResolveOutage(id: string) {
  const invalidateAll = useInvalidateOutageChange();

  return useMutation({
    mutationFn: (mttrMinutes: number) =>
      resolveOutage(id, { mttr_minutes: mttrMinutes }),
    onSuccess: () => {
      // Bust the entire affected family so every dashboard, payment
      // list and dispute panel reflects the new state immediately.
      void invalidateAll();
    },
  });
}

export function useDeleteOutage() {
  const invalidateAll = useInvalidateOutageChange();

  return useMutation({
    mutationFn: (id: string) => deleteOutage(id),
    onSuccess: () => {
      // Deleting an outage changes the same aggregates a resolve does
      // (compliance totals, payment history, dispute counts), so bust the
      // whole affected family. onSuccess only fires on a successful delete,
      // so a rejected delete (e.g. settled outage guard) invalidates nothing.
      void invalidateAll();
    },
  });
}

