import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendPoint } from "../../types/dashboard";

interface PenaltiesRewardsChartProps {
  data: TrendPoint[];
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString()}`;

const PenaltiesRewardsChart: React.FC<PenaltiesRewardsChartProps> = ({
  data,
}) => {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
        Penalties vs Rewards Over Time
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Legend />
          <Bar dataKey="penalties" name="Penalties" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Bar dataKey="rewards" name="Rewards" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PenaltiesRewardsChart;
