import { RouteLoadingState } from "@/components/ui/route-state";

export default function Loading() {
  return (
    <RouteLoadingState
      title="Loading SLA configuration"
      description="Fetching the latest severity thresholds and payout settings."
    />
  );
}
