"use client";
/** ApexChain Network Operations Intelligence Platform */
/** ApexChain Network Operations Intelligence Platform */
import { useI18n } from "@/i18n/i18n";
import dynamic from "next/dynamic";

const SLADashboardView = dynamic(
  () => import("@/components/dashboard/sla-dashboard-view"),
  {
    loading: () => {
      const { t } = useI18n();
      return (
        <div className="flex items-center justify-center p-12">
          <div className="text-sm text-gray-500">{t('common.loading')} dashboard...</div>
        </div>
      );
    },
    ssr: false,
  }
);

export default function Dashboard() {
  return <SLADashboardView />;
}