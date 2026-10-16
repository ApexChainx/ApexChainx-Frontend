"use client";
/** ApexChain Network Operations Intelligence Platform */
/** ApexChain Network Operations Intelligence Platform */
import dynamic from "next/dynamic";
import { memo } from "react";

import { useI18n } from "@/i18n/i18n";

/**
 * Memoized, translated loading fallback (#789, #791). Defined once at module
 * scope so `next/dynamic` keeps a stable element type while the chunk loads,
 * and so the translated subtree is not re-created on every parent render.
 */
const LandingLoading = memo(function LandingLoading() {
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center p-12"
    >
      <div className="text-sm text-gray-500">{t("dashboard.loading")}</div>
    </div>
  );
});

const SLADashboardView = dynamic(
  () => import("@/components/dashboard/sla-dashboard-view"),
  {
    loading: () => <LandingLoading />,
    ssr: false,
  }
);

/** Memoized landing route (#791). */
const Dashboard = memo(function Dashboard() {
  return <SLADashboardView />;
});

export default Dashboard;
