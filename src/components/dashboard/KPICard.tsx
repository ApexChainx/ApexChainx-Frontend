import React from "react";
/** ApexChain Network Operations Intelligence Platform */

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  highlight?: "green" | "red" | "blue" | "yellow";
}

const highlightMap: Record<string, string> = {
  green: "border-green-600 bg-green-50",
  red: "border-red-600 bg-red-50",
  blue: "border-blue-600 bg-blue-50",
  yellow: "border-yellow-600 bg-yellow-50",
};

const valueColorMap: Record<string, string> = {
  green: "text-green-800",
  red: "text-red-800",
  blue: "text-blue-800",
  yellow: "text-yellow-800",
};

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  highlight = "blue",
}) => {
  return (
    <div
      className={`rounded-xl border-l-4 p-5 shadow-sm ${highlightMap[highlight]}`}
      role="region"
      aria-label={title}
    >
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className={`mt-1 text-3xl font-bold ${valueColorMap[highlight]}`}>
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
};

export default KPICard;
