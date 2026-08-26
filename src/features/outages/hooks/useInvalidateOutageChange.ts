/** ApexChain Network Operations Intelligence Platform */
/**
 * Hook: useInvalidateOutageChange
 *
 * Issue #131 / #406 — Coordinate query invalidation across mutating flows.
 *
 * Any mutation that changes an outage (resolve, delete, update) should
 * invalidate every downstream aggregate so no stale data lingers:
 *  - outages (list & detail)
 *  - dashboard analytics (SLA compliance, penalties, rewards)
 *  - payments (list & detail)
 *  - disputes (list & detail)
 *  - SLA calculations & configuration
 *
 * The hub intentionally invalidates both the canonical `slaEventKeys`
 * family AND the live keys the consumers actually publish under
 * (`["dashboard-metrics", …]` in the dashboard view, `["sla", …]` for the
 * SLA config / calc keys) so a mutation always reaches the real caches.
 *
 * This hook returns a stable invalidate function suitable for use as the
 * `onSuccess` handler of outage mutations.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { slaEventKeys } from "@/lib/query-keys";

/** Live dashboard analytics key prefix (see src/components/dashboard/sla-dashboard-view.tsx). */
const DASHBOARD_METRICS_PREFIX = ["dashboard-metrics"] as const;

/** Live SLA config/calc key prefix (see src/hooks/useSlaConfig.ts and src/services/sla.ts). */
const SLA_PREFIX = ["sla"] as const;

export function useInvalidateOutageChange() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(async () => {
    await Promise.all([
      // Bust every query in the canonical SLA_EVENTS family (outages list +
      // detail, dashboard, payments, disputes, sla calculations).
      queryClient.invalidateQueries({ queryKey: slaEventKeys.all }),

      // Bust the live dashboard analytics keys the dashboard view publishes
      // under (they are not part of the slaEventKeys family).
      queryClient.invalidateQueries({ queryKey: DASHBOARD_METRICS_PREFIX }),

      // Bust the live SLA config / calculation keys (useSlaConfig publishes
      // under ["sla", "config"]; slaQueryKeys under ["sla", …]).
      queryClient.invalidateQueries({ queryKey: SLA_PREFIX }),
    ]);
  }, [queryClient]);

  return invalidate;
}
