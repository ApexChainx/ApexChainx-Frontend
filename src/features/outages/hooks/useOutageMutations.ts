import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteOutage, getOutage, resolveOutage } from "@/services/outages";
import { slaEventKeys } from "@/lib/query-keys";
import { useInvalidateOutageChange } from "./useInvalidateOnResolve";
import { mutationQueue, registerMutationExecutor } from "@/lib/mutation-queue";

/**
 * Re-export slaEventKeys.outages as outageKeys so existing imports continue
 * to work without changes. All consumers get the full SLA_EVENTS key family.
 */
export const outageKeys = slaEventKeys.outages;

// Register outage mutation executors with the mutation queue
registerMutationExecutor("resolveOutage", async (payload: { id: string; mttrMinutes: number }) => {
  await resolveOutage(payload.id, { mttr_minutes: payload.mttrMinutes });
});

registerMutationExecutor("deleteOutage", async (payload: { id: string }) => {
  await deleteOutage(payload.id);
});

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
  const qc = useQueryClient();
  const invalidateAll = useInvalidateOutageChange();

  return useMutation({
    mutationFn: (mttrMinutes: number) => {
      const idempotencyKey = `resolve-outage-${id}-${mttrMinutes}`;
      // Queue for offline replay
      void mutationQueue.enqueue({
        idempotencyKey,
        type: "resolveOutage",
        payload: { id, mttrMinutes },
      });
      return resolveOutage(id, { mttr_minutes: mttrMinutes });
    },
    onSuccess: () => {
      void invalidateAll();
      void mutationQueue.remove(`resolve-outage-${id}-`);
    },
  });
}

export function useDeleteOutage() {
  const invalidateAll = useInvalidateOutageChange();
  return useMutation({
    mutationFn: (id: string) => {
      const idempotencyKey = `delete-outage-${id}`;
      void mutationQueue.enqueue({
        idempotencyKey,
        type: "deleteOutage",
        payload: { id },
      });
      return deleteOutage(id);
    },
    onSuccess: () => {
      void invalidateAll();
      void mutationQueue.remove(`delete-outage-`);
    },
  });
}

