"use client";
/** ApexChain Network Operations Intelligence Platform */

import { memo } from "react";
import dynamic from "next/dynamic";

import { LandingLoadingFallback } from "@/components/landing/landing-loading";

// The chunk loader lives at module scope so it is created exactly once.
const loadSLADashboardView = () =>
  import("@/components/dashboard/sla-dashboard-view");

const SLADashboardView = dynamic(loadSLADashboardView, {
  loading: () => <LandingLoadingFallback />,
  ssr: false,
});

/**
 * Landing route (#782). `memo` keeps the route from re-rendering when its
 * parent re-renders for an unrelated reason — the dashboard chunk owned by
 * `next/dynamic` is left untouched.
 */
const Dashboard = memo(function Dashboard() {
  return <SLADashboardView />;
});

export default Dashboard;
