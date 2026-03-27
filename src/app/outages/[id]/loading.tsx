import { RouteLoadingState } from "@/components/ui/route-state";

export default function Loading() {
  return (
    <RouteLoadingState
      title="Loading outage details"
      description="Pulling the incident timeline, SLA outcome, and payment state."
    />
  );
}
