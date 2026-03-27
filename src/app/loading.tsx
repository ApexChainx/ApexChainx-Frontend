import { RouteLoadingState } from "@/components/ui/route-state";

export default function Loading() {
  return (
    <RouteLoadingState
      title="Loading workspace"
      description="Preparing the latest dashboard and workflow data for you."
    />
  );
}
