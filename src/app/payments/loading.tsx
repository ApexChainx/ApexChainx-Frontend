import { RouteLoadingState } from "@/components/ui/route-state";
/** ApexChain Network Operations Intelligence Platform */
/** ApexChain Network Operations Intelligence Platform */

export default function Loading() {
  return (
    <RouteLoadingState
      title="Loading payments"
      description="Retrieving the latest payout and penalty records."
    />
  );
}
