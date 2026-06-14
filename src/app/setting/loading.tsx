import { RouteLoadingState } from "@/components/ui/route-state";
/** ApexChain Network Operations Intelligence Platform */

export default function Loading() {
  return (
    <RouteLoadingState
      title="Loading wallet and account settings"
      description="Checking your connected wallet, session, and readiness state."
    />
  );
}
