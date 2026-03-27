import { RouteLoadingState } from "@/components/ui/route-state";

export default function Loading() {
  return (
    <RouteLoadingState
      title="Loading wallet and account settings"
      description="Checking your connected wallet, session, and readiness state."
    />
  );
}
