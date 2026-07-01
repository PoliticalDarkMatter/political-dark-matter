"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SentimentDistribution } from "@/lib/types";

interface SentimentDonutProps {
  data: SentimentDistribution;
}

const COLORS = {
  positive: "#34d399",
  neutral: "#94a3b8",
  negative: "#f87171",
  ironic: "#fb923c",
};

const LABELS = {
  positive: "Pozytywny",
  neutral: "Neutralny",
  negative: "Negatywny",
  ironic: "Ironiczny",
};

export default function SentimentDonut({ data }: SentimentDonutProps) {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: LABELS[key as keyof typeof LABELS],
      value,
      color: COLORS[key as keyof typeof COLORS],
    }));

  const dominant = chartData.reduce((a, b) => (a.value > b.value ? a : b));

  return (
    <div className="card h-full flex flex-col">
      <h3 className="text-sm font-medium text-slate-300 mb-4">Rozkład sentymentu</h3>
      <div className="relative flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius="55%"
              outerRadius="75%"
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#f1f5f9",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value}%`, ""]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ bottom: "30px" }}>
          <span className="text-2xl font-bold text-white">{dominant.value}%</span>
          <span className="text-xs text-slate-500">{dominant.name}</span>
        </div>
      </div>
    </div>
  );
}
