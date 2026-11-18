"use client";
/** ApexChain Network Operations Intelligence Platform */

import { memo } from "react";
import dynamic from "next/dynamic";

import { LandingLoadingFallback } from "@/components/landing/landing-loading";

const SLADashboardView = dynamic(
  () => import("@/components/dashboard/sla-dashboard-view"),
  {
    loading: () => <LandingLoadingFallback />,
    ssr: false,
  }
);

/** Memoized landing route (#791). */
const Dashboard = memo(function Dashboard() {
  return <SLADashboardView />;
});

export default Dashboard;
