import SLADashboardView from "@/components/dashboard/sla-dashboard-view";
import { ReactQueryProvider } from "@/providers/react-query";

export default function SLADashboard() {
  return (
    <ReactQueryProvider>
      <SLADashboardView />
    </ReactQueryProvider>
  );
}
