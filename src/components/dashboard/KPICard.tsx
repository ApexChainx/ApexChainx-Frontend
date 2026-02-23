import React from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  highlight?: "green" | "red" | "blue" | "yellow";
}

const highlightMap: Record<string, string> = {
  green: "border-green-500 bg-green-50",
  red: "border-red-500 bg-red-50",
  blue: "border-blue-500 bg-blue-50",
  yellow: "border-yellow-500 bg-yellow-50",
};

const valueColorMap: Record<string, string> = {
  green: "text-green-700",
  red: "text-red-700",
  blue: "text-blue-700",
  yellow: "text-yellow-700",
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
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-1 text-3xl font-bold ${valueColorMap[highlight]}`}>
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
};

export default KPICard;
