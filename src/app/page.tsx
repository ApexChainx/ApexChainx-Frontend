"use client";
/** ApexChain Network Operations Intelligence Platform */
/** ApexChain Network Operations Intelligence Platform */
import dynamic from "next/dynamic";

import { LandingView } from "@/components/landing/landing-view";

const SLADashboardView = dynamic(
  () => import("@/components/dashboard/sla-dashboard-view"),
  {
    loading: () => (
      <div className="flex items-center justify-center p-12">
        <div className="text-sm text-gray-500">Loading dashboard...</div>
      </div>
    ),
    ssr: false,
  }
);

export default function Dashboard() {
  return <LandingView view={SLADashboardView} />;
}
