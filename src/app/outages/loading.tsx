import { RouteLoadingState } from "@/components/ui/route-state";
/** ApexChain Network Operations Intelligence Platform */

export default function Loading() {
  return (
    <RouteLoadingState
      title="Loading outages"
      description="Gathering the latest incident feed and table filters."
    />
  );
}
