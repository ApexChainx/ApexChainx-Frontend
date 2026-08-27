/** ApexChain Network Operations Intelligence Platform */
/**
 * Hook: useInvalidateOnResolve
 *
 * Issue #131 — Coordinate query invalidation across mutating flows.
 *
 * Resolving an outage from /outages/[id] should invalidate:
 *  - outages (list & detail)
 *  - dashboard-metrics (SLA compliance, penalties, rewards)
 *  - SLA disputes panels
 *  - SLA configuration
 *
 * Every invalidated root MUST prefix a real `useQuery({ queryKey })`
 * published somewhere in the app — otherwise the invalidate silently no-ops
 * and stale data survives. The `tests/query-key-registry.test.ts` guard
 * (issue #382) enforces this statically; the roots below were aligned with
 * the actual query keys published by:
 *   - useOutages / useOutage        -> slaEventKeys.outages.*
 *   - SLADashboardView               -> ["dashboard-metrics", filters]
 *   - SLADisputesPanel               -> ["sla-disputes", ...]
 *   - useSlaConfig                   -> ["sla", "config"]
 * (Payments have no React Query cache today and are intentionally absent.)
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { slaEventKeys } from "@/lib/query-keys";

export function useInvalidateOnResolve() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(async () => {
    await Promise.all([
      // Bust all outage queries (list + detail)
      queryClient.invalidateQueries({ queryKey: slaEventKeys.outages.all }),

      // Bust dashboard analytics (SLA compliance, trends) — the dashboard
      // publishes ["dashboard-metrics", filters], invalidate the prefix.
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] }),

      // Bust dispute lists — SLADisputesPanel publishes ["sla-disputes", ...].
      queryClient.invalidateQueries({ queryKey: ["sla-disputes"] }),

      // Bust SLA configuration — useSlaConfig publishes ["sla", "config"].
      queryClient.invalidateQueries({ queryKey: ["sla", "config"] }),
    ]);
  }, [queryClient]);

  return invalidate;
}