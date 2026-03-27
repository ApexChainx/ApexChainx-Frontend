import { RouteLoadingState } from "@/components/ui/route-state";

export default function Loading() {
  return (
    <RouteLoadingState
      title="Loading outages"
      description="Gathering the latest incident feed and table filters."
    />
  );
}
