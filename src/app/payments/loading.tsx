import { RouteLoadingState } from "@/components/ui/route-state";

export default function Loading() {
  return (
    <RouteLoadingState
      title="Loading payments"
      description="Retrieving the latest payout and penalty records."
    />
  );
}
